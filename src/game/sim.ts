import { DIR_VEC, type Dir, type Instr, type Level, type Program } from './types';
import { exitIndex, starIndices } from './levels';

export type RunStatus = 'win' | 'crash' | 'incomplete' | 'timeout' | 'running';

export interface Frame {
  x: number;
  y: number;
  dir: Dir;
  mask: number;
  status: RunStatus;
  note?: string;
  /** подсветка: адрес выполняемой инструкции */
  scope?: 'main' | 'f0' | 'f1';
  path?: number[];
}

export interface RunResult {
  frames: Frame[];
  status: Exclude<RunStatus, 'running'>;
  message: string;
  starsCollected: number;
  starsTotal: number;
}

export function simulate(level: Level, prog: Program, maxSteps = 5000): RunResult {
  const stars = starIndices(level);
  const full = (1 << stars.length) - 1;
  const exitIdx = exitIndex(level);
  const starBit = new Map<number, number>();
  stars.forEach((cell, i) => starBit.set(cell, i));

  let x = level.start.x;
  let y = level.start.y;
  let dir: Dir = level.dir;
  let mask = 0;
  const startIdx = y * level.w + x;
  if (starBit.has(startIdx)) mask |= 1 << starBit.get(startIdx)!;

  let status: RunStatus = 'running';
  let message = '';
  let steps = 0;

  const frames: Frame[] = [{ x, y, dir, mask, status: 'running' }];

  const push = (note?: string, scope?: Frame['scope'], path?: number[]) => {
    frames.push({ x, y, dir, mask, status, note, scope, path });
  };

  const checkWin = () => {
    if (y * level.w + x === exitIdx && mask === full) {
      status = 'win';
      message = 'Уровень пройден! Все звёзды собраны, робот на выходе.';
    }
  };

  const run = (list: Instr[], depth: number, scope: Frame['scope'], path: number[]) => {
    if (depth > 60) {
      status = 'timeout';
      message = 'Слишком глубокая рекурсия вызовов функций.';
      return;
    }
    for (let k = 0; k < list.length; k++) {
      if (status !== 'running') return;
      const ins = list[k];
      const here = [...path, k];
      steps++;
      if (steps > maxSteps) {
        status = 'timeout';
        message = 'Программа слишком долгая (возможно, бесконечный цикл).';
        return;
      }
      if (ins.t === 'F') {
        const v = DIR_VEC[dir];
        const nx = x + v.dx;
        const ny = y + v.dy;
        if (nx < 0 || ny < 0 || nx >= level.w || ny >= level.h) {
          status = 'crash';
          message = 'Робот врезался в стену поля.';
          push('Выход за границу поля', scope, here);
          return;
        }
        if (level.cells[ny * level.w + nx] === 'wall') {
          status = 'crash';
          message = 'Робот врезался в красное препятствие.';
          push('Столкновение с препятствием', scope, here);
          return;
        }
        x = nx;
        y = ny;
        const bit = starBit.get(ny * level.w + nx);
        if (bit !== undefined) mask |= 1 << bit;
        checkWin();
        push('Вперёд', scope, here);
      } else if (ins.t === 'L') {
        dir = (((dir + 3) % 4) as Dir);
        push('Поворот налево', scope, here);
      } else if (ins.t === 'R') {
        dir = (((dir + 1) % 4) as Dir);
        push('Поворот направо', scope, here);
      } else if (ins.t === 'call') {
        const body = prog.funcs[ins.f] ?? [];
        if (!body.length) {
          push(`Функция F${ins.f + 1} пуста`, scope, here);
          continue;
        }
        run(body, depth + 1, (ins.f === 0 ? 'f0' : 'f1') as Frame['scope'], []);
      } else if (ins.t === 'repeat') {
        for (let r = 0; r < ins.n; r++) {
          if (status !== 'running') return;
          run(ins.body, depth + 1, scope, here);
        }
      }
      if (status !== 'running') return;
    }
  };

  run(prog.main, 0, 'main', []);

  if (status === 'running') {
    if (y * level.w + x === exitIdx && mask === full) {
      status = 'win';
      message = 'Уровень пройден! Все звёзды собраны, робот на выходе.';
    } else if (mask !== full) {
      status = 'incomplete';
      const left = stars.length - popcount(mask);
      message = `Программа закончилась: не собрано звёзд — ${left}.`;
    } else {
      status = 'incomplete';
      message = 'Все звёзды собраны, но робот не на точке выхода.';
    }
    push();
  }

  frames[frames.length - 1].status = status;

  return {
    frames,
    status: status as Exclude<RunStatus, 'running'>,
    message,
    starsCollected: popcount(mask),
    starsTotal: stars.length,
  };
}

export function popcount(n: number): number {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

export function instrLabel(i: Instr): string {
  switch (i.t) {
    case 'F':
      return 'Вперёд';
    case 'L':
      return 'Налево';
    case 'R':
      return 'Направо';
    case 'call':
      return `F${i.f + 1}`;
    case 'repeat':
      return `Повтор ×${i.n}`;
  }
}

export function programToText(prog: Program): string {
  const fmt = (list: Instr[]): string =>
    list
      .map((i) => {
        if (i.t === 'repeat') return `ПОВТОР ${i.n} [ ${fmt(i.body)} ]`;
        if (i.t === 'call') return `F${i.f + 1}`;
        return { F: 'ВПЕРЁД', L: 'НАЛЕВО', R: 'НАПРАВО' }[i.t];
      })
      .join(', ');
  const parts = [`ОСНОВНАЯ: ${fmt(prog.main) || '—'}`];
  prog.funcs.forEach((f, i) => {
    if (f.length) parts.push(`F${i + 1}: ${fmt(f)}`);
  });
  return parts.join('\n');
}
