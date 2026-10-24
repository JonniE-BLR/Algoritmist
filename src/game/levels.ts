import type { CellType, Dir, Level } from './types';

const CHAR: Record<CellType, string> = {
  empty: '.',
  wall: '#',
  star: '*',
  exit: 'E',
};

const FROM_CHAR: Record<string, CellType> = {
  '.': 'empty',
  '#': 'wall',
  '*': 'star',
  E: 'exit',
};

/** Классический уровень из задания (10x10) */
const DEFAULT_ROWS = [
  '...*.#..#E',
  '.#..#..#..',
  '.*....#..*',
  '..#.#...#.',
  '..*...#...',
  '#...#.*#..',
  '.....#...#',
  '.#.#..#...',
  '........#.',
  '..#..*....',
];

export function levelFromRows(rows: string[], start: { x: number; y: number }, dir: Dir): Level {
  const h = rows.length;
  const w = rows[0].length;
  const cells: CellType[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      cells.push(FROM_CHAR[rows[y][x]] ?? 'empty');
    }
  }
  return { w, h, cells, start, dir };
}

export function defaultLevel(): Level {
  return levelFromRows(DEFAULT_ROWS, { x: 0, y: 9 }, 0);
}

export function emptyLevel(w = 10, h = 10): Level {
  return {
    w,
    h,
    cells: new Array(w * h).fill('empty') as CellType[],
    start: { x: 0, y: h - 1 },
    dir: 0,
  };
}

export function cloneLevel(l: Level): Level {
  return { w: l.w, h: l.h, cells: [...l.cells], start: { ...l.start }, dir: l.dir };
}

export function starIndices(level: Level): number[] {
  const res: number[] = [];
  level.cells.forEach((c, i) => {
    if (c === 'star') res.push(i);
  });
  return res;
}

export function exitIndex(level: Level): number {
  return level.cells.findIndex((c) => c === 'exit');
}

export function encodeLevel(l: Level): string {
  const rows: string[] = [];
  for (let y = 0; y < l.h; y++) {
    let r = '';
    for (let x = 0; x < l.w; x++) r += CHAR[l.cells[y * l.w + x]];
    rows.push(r);
  }
  return JSON.stringify({ rows, start: l.start, dir: l.dir });
}

export function decodeLevel(s: string): Level | null {
  try {
    const o = JSON.parse(s);
    if (!Array.isArray(o.rows) || !o.rows.length) return null;
    return levelFromRows(o.rows, o.start ?? { x: 0, y: o.rows.length - 1 }, (o.dir ?? 0) as Dir);
  } catch {
    return null;
  }
}

export function validateLevel(l: Level): string | null {
  const si = l.start.y * l.w + l.start.x;
  if (l.cells[si] === 'wall') return 'Робот стоит на препятствии';
  if (exitIndex(l) < 0) return 'Нет точки выхода (оранжевый круг)';
  const stars = starIndices(l).length;
  if (stars === 0) return 'Нет ни одной звезды';
  if (stars > 12) return 'Слишком много звёзд (максимум 12)';
  return null;
}
