export type CellType = 'empty' | 'wall' | 'star' | 'exit';

/** 0 = вверх, 1 = вправо, 2 = вниз, 3 = влево */
export type Dir = 0 | 1 | 2 | 3;

export interface Level {
  w: number;
  h: number;
  cells: CellType[]; // length w*h, index = y*w + x
  start: { x: number; y: number };
  dir: Dir;
}

export type Instr =
  | { t: 'F' }
  | { t: 'L' }
  | { t: 'R' }
  | { t: 'call'; f: number }
  | { t: 'repeat'; n: number; body: Instr[] };

export interface Program {
  main: Instr[];
  funcs: Instr[][]; // [F1, F2]
}

export const DIR_VEC: Record<Dir, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },
  1: { dx: 1, dy: 0 },
  2: { dx: 0, dy: 1 },
  3: { dx: -1, dy: 0 },
};

export const MAX_REPEAT_BODY = 4;
export const MAX_FUNC_LEN = 5;

export function emptyProgram(): Program {
  return { main: [], funcs: [[], []] };
}

export function cloneInstr(i: Instr): Instr {
  if (i.t === 'repeat') return { t: 'repeat', n: i.n, body: i.body.map(cloneInstr) };
  return { ...i };
}

export function cloneProgram(p: Program): Program {
  return {
    main: p.main.map(cloneInstr),
    funcs: p.funcs.map((f) => f.map(cloneInstr)),
  };
}

export function countBlocks(list: Instr[]): number {
  let n = 0;
  for (const i of list) {
    n += 1;
    if (i.t === 'repeat') n += countBlocks(i.body);
  }
  return n;
}

export function programBlocks(p: Program): number {
  return countBlocks(p.main) + countBlocks(p.funcs[0]) + countBlocks(p.funcs[1]);
}

export function usesFunc(list: Instr[], f: number): boolean {
  for (const i of list) {
    if (i.t === 'call' && i.f === f) return true;
    if (i.t === 'repeat' && usesFunc(i.body, f)) return true;
  }
  return false;
}
