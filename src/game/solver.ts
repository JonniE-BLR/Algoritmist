import { DIR_VEC, type Instr, type Level, type Program } from './types';
import { exitIndex, starIndices } from './levels';

export interface SolverOptions {
  /** максимум блоков внутри ПОВТОРА (1..4) */
  maxRepeatBody: number;
  /** максимальное число повторений N */
  maxRepeatN: number;
  /** сколько функций разрешено использовать: 0, 1 или 2 */
  funcs: 0 | 1 | 2;
  /** максимум блоков в функции (1..5) */
  maxFuncLen: number;
  /** разрешить вызовы функций внутри повтора */
  callsInRepeat: boolean;
  /** верхняя граница перебора по числу блоков */
  maxBlocks: number;
}

export const DEFAULT_OPTIONS: SolverOptions = {
  maxRepeatBody: 4,
  maxRepeatN: 12,
  funcs: 1,
  maxFuncLen: 5,
  callsInRepeat: false,
  maxBlocks: 40,
};

export interface SolveCandidate {
  program: Program;
  blocks: number;
  label: string;
}

export interface SolveOutcome {
  best: SolveCandidate | null;
  baseline: SolveCandidate | null;
  tried: number;
  total: number;
  ms: number;
  notes: string[];
  cancelled: boolean;
}

const INF = 0x3fffffff;

interface Engine {
  M: number;
  nStates: number;
  tF: Int32Array;
  tL: Int32Array;
  tR: Int32Array;
  goal: Uint8Array;
  start: number;
  stars: number;
}

export function buildEngine(level: Level): Engine {
  const nCells = level.w * level.h;
  const stars = starIndices(level);
  const S = stars.length;
  const M = 1 << S;
  const exitIdx = exitIndex(level);
  const full = M - 1;
  const bitOf = new Int32Array(nCells).fill(-1);
  stars.forEach((c, i) => (bitOf[c] = i));

  const nStates = nCells * 4 * M;
  const tF = new Int32Array(nStates).fill(-1);
  const tL = new Int32Array(nStates).fill(-1);
  const tR = new Int32Array(nStates).fill(-1);
  const goal = new Uint8Array(nStates);

  const idx = (cell: number, dir: number, mask: number) => (cell * 4 + dir) * M + mask;

  for (let cell = 0; cell < nCells; cell++) {
    if (level.cells[cell] === 'wall') continue;
    const x = cell % level.w;
    const y = Math.floor(cell / level.w);
    for (let dir = 0; dir < 4; dir++) {
      for (let mask = 0; mask < M; mask++) {
        const s = idx(cell, dir, mask);
        if (cell === exitIdx && mask === full) {
          goal[s] = 1;
          tF[s] = s;
          tL[s] = s;
          tR[s] = s;
          continue;
        }
        tL[s] = idx(cell, (dir + 3) % 4, mask);
        tR[s] = idx(cell, (dir + 1) % 4, mask);
        const v = DIR_VEC[dir as 0 | 1 | 2 | 3];
        const nx = x + v.dx;
        const ny = y + v.dy;
        if (nx < 0 || ny < 0 || nx >= level.w || ny >= level.h) continue;
        const nc = ny * level.w + nx;
        if (level.cells[nc] === 'wall') continue;
        let nm = mask;
        if (bitOf[nc] >= 0) nm |= 1 << bitOf[nc];
        tF[s] = idx(nc, dir, nm);
      }
    }
  }

  const startCell = level.start.y * level.w + level.start.x;
  let startMask = 0;
  if (bitOf[startCell] >= 0) startMask |= 1 << bitOf[startCell];
  const start = idx(startCell, level.dir, startMask);

  return { M, nStates, tF, tL, tR, goal, start, stars: S };
}

/** Применить карту одного символа поверх предыдущей композиции */
function compose(prev: Int32Array | null, symMap: Int32Array, n: number): Int32Array {
  const out = new Int32Array(n);
  if (!prev) {
    out.set(symMap);
    return out;
  }
  for (let s = 0; s < n; s++) {
    const a = prev[s];
    out[s] = a < 0 ? -1 : symMap[a];
  }
  return out;
}

/** Отсев заведомо избыточных последовательностей (LR, RL, LLL, RRR) */
function badTail(seq: number[]): boolean {
  const n = seq.length;
  if (n >= 2) {
    const a = seq[n - 2];
    const b = seq[n - 1];
    if ((a === 1 && b === 2) || (a === 2 && b === 1)) return true;
  }
  if (n >= 3) {
    const a = seq[n - 3];
    if (a === seq[n - 2] && a === seq[n - 1] && (a === 1 || a === 2)) return true;
  }
  return false;
}

interface BodySet {
  seqs: number[][];
  maps: Int32Array[];
  lens: number[];
}

/** Все допустимые тела повтора длиной 1..maxLen над алфавитом symMaps */
function buildBodies(eng: Engine, symMaps: Int32Array[], maxLen: number): BodySet {
  const seqs: number[][] = [];
  const maps: Int32Array[] = [];
  const lens: number[] = [];
  const walk = (seq: number[], map: Int32Array | null) => {
    if (seq.length >= maxLen) return;
    for (let sym = 0; sym < symMaps.length; sym++) {
      const next = [...seq, sym];
      if (badTail(next)) continue;
      const m = compose(map, symMaps[sym], eng.nStates);
      seqs.push(next);
      maps.push(m);
      lens.push(next.length);
      walk(next, m);
    }
  };
  walk([], null);
  return { seqs, maps, lens };
}

function allSequences(maxLen: number): number[][] {
  const res: number[][] = [];
  const walk = (seq: number[]) => {
    if (seq.length >= maxLen) return;
    for (let sym = 0; sym < 3; sym++) {
      const next = [...seq, sym];
      if (badTail(next)) continue;
      res.push(next);
      walk(next);
    }
  };
  walk([]);
  return res;
}

interface DijkstraResult {
  found: boolean;
  cost: number;
  edges: { edge: number }[];
}

/**
 * Поиск кратчайшей (по числу блоков) программы.
 * Рёбра: вперёд/налево/направо (1 блок), вызов функции (1 блок),
 * повтор N раз с телом длины L (1 + L блоков).
 */
function dijkstra(
  eng: Engine,
  bodies: BodySet,
  funcMaps: (Int32Array | null)[],
  maxRepeatN: number,
  limit: number,
): DijkstraResult {
  if (limit < 0) return { found: false, cost: -1, edges: [] };
  const n = eng.nStates;
  const dist = new Int32Array(n).fill(INF);
  const par = new Int32Array(n).fill(-1);
  const parEdge = new Int32Array(n).fill(-1);
  const buckets: number[][] = Array.from({ length: limit + 2 }, () => []);
  dist[eng.start] = 0;
  buckets[0].push(eng.start);

  const { tF, tL, tR, goal } = eng;
  const nb = bodies.maps.length;

  let goalState = -1;
  outer: for (let c = 0; c <= limit; c++) {
    const b = buckets[c];
    for (let qi = 0; qi < b.length; qi++) {
      const s = b[qi];
      if (dist[s] !== c) continue;
      if (goal[s]) {
        goalState = s;
        break outer;
      }
      const c1 = c + 1;
      if (c1 <= limit) {
        // примитивы
        const prims = [tF[s], tL[s], tR[s]];
        for (let p = 0; p < 3; p++) {
          const t = prims[p];
          if (t >= 0 && c1 < dist[t]) {
            dist[t] = c1;
            par[t] = s;
            parEdge[t] = p;
            buckets[c1].push(t);
          }
        }
        // вызовы функций
        for (let f = 0; f < funcMaps.length; f++) {
          const fm = funcMaps[f];
          if (!fm) continue;
          const t = fm[s];
          if (t >= 0 && c1 < dist[t]) {
            dist[t] = c1;
            par[t] = s;
            parEdge[t] = 3 + f;
            buckets[c1].push(t);
          }
        }
      }
      // повторы
      for (let bi = 0; bi < nb; bi++) {
        const cost = c + 1 + bodies.lens[bi];
        if (cost > limit) continue;
        const map = bodies.maps[bi];
        let t = s;
        for (let k = 1; k <= maxRepeatN; k++) {
          t = map[t];
          if (t < 0) break;
          if (k >= 2) {
            if (cost < dist[t]) {
              dist[t] = cost;
              par[t] = s;
              parEdge[t] = 10 + bi * 64 + k;
              buckets[cost].push(t);
            }
          }
          if (t === s) break;
        }
      }
    }
  }

  if (goalState < 0) return { found: false, cost: -1, edges: [] };
  const edges: { edge: number }[] = [];
  let cur = goalState;
  while (cur !== eng.start) {
    edges.push({ edge: parEdge[cur] });
    cur = par[cur];
  }
  edges.reverse();
  return { found: true, cost: dist[goalState], edges };
}

function symToInstr(sym: number): Instr {
  if (sym === 0) return { t: 'F' };
  if (sym === 1) return { t: 'L' };
  if (sym === 2) return { t: 'R' };
  return { t: 'call', f: sym - 3 };
}

function edgesToInstrs(edges: { edge: number }[], bodies: BodySet): Instr[] {
  const out: Instr[] = [];
  for (const { edge } of edges) {
    if (edge < 3) out.push(symToInstr(edge));
    else if (edge < 10) out.push({ t: 'call', f: edge - 3 });
    else {
      const code = edge - 10;
      const bi = Math.floor(code / 64);
      const n = code % 64;
      out.push({ t: 'repeat', n, body: bodies.seqs[bi].map(symToInstr) });
    }
  }
  return out;
}

const sleep = () => new Promise((r) => setTimeout(r, 0));

export interface Progress {
  tried: number;
  total: number;
  stage: string;
  best: number | null;
}

export async function solveLevel(
  level: Level,
  optionsIn: Partial<SolverOptions>,
  onProgress?: (p: Progress) => void,
  isCancelled?: () => boolean,
): Promise<SolveOutcome> {
  const opts: SolverOptions = { ...DEFAULT_OPTIONS, ...optionsIn };
  const t0 = performance.now();
  const notes: string[] = [];
  const eng = buildEngine(level);

  // ограничение памяти на карты тел повтора
  let maxBody = Math.max(1, Math.min(4, opts.maxRepeatBody));
  const alphabet = opts.callsInRepeat ? 3 + opts.funcs : 3;
  const estimate = (len: number) => {
    let cnt = 0;
    for (let i = 1; i <= len; i++) cnt += Math.pow(alphabet, i);
    return (cnt * eng.nStates * 4) / (1024 * 1024);
  };
  while (maxBody > 1 && estimate(maxBody) > 120) {
    maxBody--;
    notes.push(`Из-за размера поля длина тела повтора в переборе уменьшена до ${maxBody}.`);
  }

  const plainMaps = [eng.tF, eng.tL, eng.tR];
  const bodiesPlain = buildBodies(eng, plainMaps, maxBody);

  const mk = (edges: { edge: number }[], bodies: BodySet, f1: number[] | null, f2: number[] | null, cost: number): SolveCandidate => {
    const program: Program = {
      main: edgesToInstrs(edges, bodies),
      funcs: [f1 ? f1.map(symToInstr) : [], f2 ? f2.map(symToInstr) : []],
    };
    const blocks = cost + (f1?.length ?? 0) + (f2?.length ?? 0);
    const labelParts = ['повтор'];
    if (f1) labelParts.push('F1');
    if (f2) labelParts.push('F2');
    return { program, blocks, label: labelParts.join(' + ') };
  };

  onProgress?.({ tried: 0, total: 1, stage: 'Базовый перебор (без функций)…', best: null });
  await sleep();

  const base = dijkstra(eng, bodiesPlain, [], opts.maxRepeatN, opts.maxBlocks);
  let baseline: SolveCandidate | null = null;
  let best: SolveCandidate | null = null;
  if (base.found) {
    baseline = mk(base.edges, bodiesPlain, null, null, base.cost);
    best = baseline;
  } else {
    notes.push(`Решение без функций не найдено в пределах ${opts.maxBlocks} блоков.`);
  }

  let tried = 1;
  let total = 1;
  let cancelled = false;

  if (opts.funcs >= 1) {
    const cands = allSequences(opts.maxFuncLen);
    total = 1 + cands.length + (opts.funcs === 2 ? (cands.length * (cands.length + 1)) / 2 : 0);
    let lastYield = performance.now();

    // --- одна функция ---
    for (let i = 0; i < cands.length; i++) {
      if (isCancelled?.()) {
        cancelled = true;
        break;
      }
      const f1 = cands[i];
      const f1map = f1.reduce<Int32Array | null>((acc, sym) => compose(acc, plainMaps[sym], eng.nStates), null)!;
      const limit = (best ? best.blocks - 1 : opts.maxBlocks) - f1.length;
      if (limit >= 1) {
        const bodies = opts.callsInRepeat ? buildBodies(eng, [...plainMaps, f1map], maxBody) : bodiesPlain;
        const r = dijkstra(eng, bodies, [f1map], opts.maxRepeatN, limit);
        if (r.found) best = mk(r.edges, bodies, f1, null, r.cost);
      }
      tried++;
      if (performance.now() - lastYield > 60) {
        onProgress?.({ tried, total, stage: 'Перебор тел функции F1…', best: best?.blocks ?? null });
        await sleep();
        lastYield = performance.now();
      }
    }

    // --- две функции ---
    if (opts.funcs === 2 && !cancelled) {
      const pairBody = opts.callsInRepeat ? Math.min(maxBody, 2) : maxBody;
      if (opts.callsInRepeat && pairBody < maxBody) {
        notes.push(
          `В переборе пар функций длина тела повтора ограничена ${pairBody} блоками (иначе перебор занял бы часы).`,
        );
      }
      for (let i = 0; i < cands.length && !cancelled; i++) {
        const f1 = cands[i];
        const f1map = f1.reduce<Int32Array | null>((acc, sym) => compose(acc, plainMaps[sym], eng.nStates), null)!;
        for (let j = i; j < cands.length; j++) {
          if (isCancelled?.()) {
            cancelled = true;
            break;
          }
          const f2 = cands[j];
          const limit = (best ? best.blocks - 1 : opts.maxBlocks) - f1.length - f2.length;
          tried++;
          if (limit >= 1) {
            const f2map = f2.reduce<Int32Array | null>((acc, sym) => compose(acc, plainMaps[sym], eng.nStates), null)!;
            const bodies = opts.callsInRepeat
              ? buildBodies(eng, [...plainMaps, f1map, f2map], pairBody)
              : bodiesPlain;
            const r = dijkstra(eng, bodies, [f1map, f2map], opts.maxRepeatN, limit);
            if (r.found) best = mk(r.edges, bodies, f1, f2, r.cost);
          }
          if (performance.now() - lastYield > 60) {
            onProgress?.({ tried, total, stage: 'Перебор пар функций F1 + F2…', best: best?.blocks ?? null });
            await sleep();
            lastYield = performance.now();
          }
        }
      }
    }
  }

  return {
    best,
    baseline,
    tried,
    total,
    ms: performance.now() - t0,
    notes,
    cancelled,
  };
}
