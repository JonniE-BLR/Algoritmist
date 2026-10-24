import type { Level, Program } from './types';
import { defaultLevel, encodeLevel } from './levels';

export interface ReferenceSolution {
  title: string;
  note: string;
  blocks: number;
  program: Program;
}

const P = (s: string): Program => JSON.parse(s) as Program;

export const REFERENCE_SOLUTIONS: ReferenceSolution[] = [
  {
    title: 'Только ПОВТОР (без функций)',
    note: 'Доказанный оптимум полного перебора: 36 блоков. Тело повтора ≤ 4 команд.',
    blocks: 36,
    program: P(
      '{"main":[{"t":"F"},{"t":"R"},{"t":"repeat","n":6,"body":[{"t":"F"}]},{"t":"repeat","n":3,"body":[{"t":"R"},{"t":"F"}]},{"t":"repeat","n":5,"body":[{"t":"F"},{"t":"L"},{"t":"F"},{"t":"R"}]},{"t":"repeat","n":4,"body":[{"t":"F"},{"t":"R"}]},{"t":"repeat","n":3,"body":[{"t":"F"},{"t":"F"},{"t":"F"},{"t":"R"}]},{"t":"repeat","n":2,"body":[{"t":"L"},{"t":"F"}]},{"t":"repeat","n":3,"body":[{"t":"F"},{"t":"R"},{"t":"F"},{"t":"L"}]},{"t":"L"},{"t":"repeat","n":2,"body":[{"t":"F"},{"t":"R"},{"t":"F"},{"t":"L"}]},{"t":"repeat","n":5,"body":[{"t":"F"}]}],"funcs":[[],[]]}',
    ),
  },
  {
    title: 'ПОВТОР + одна функция F1',
    note: 'Вызовы F1 только в основной программе. Оптимум: 32 блока.',
    blocks: 32,
    program: P(
      '{"main":[{"t":"F"},{"t":"R"},{"t":"repeat","n":5,"body":[{"t":"F"}]},{"t":"repeat","n":3,"body":[{"t":"R"},{"t":"F"}]},{"t":"F"},{"t":"call","f":0},{"t":"repeat","n":6,"body":[{"t":"R"},{"t":"F"},{"t":"L"}]},{"t":"call","f":0},{"t":"F"},{"t":"R"},{"t":"call","f":0},{"t":"call","f":0},{"t":"repeat","n":3,"body":[{"t":"F"}]},{"t":"R"},{"t":"call","f":0},{"t":"R"},{"t":"call","f":0},{"t":"call","f":0},{"t":"R"},{"t":"call","f":0},{"t":"repeat","n":4,"body":[{"t":"F"}]}],"funcs":[[{"t":"F"},{"t":"L"},{"t":"F"}],[]]}',
    ),
  },
  {
    title: 'ПОВТОР + F1 (вызовы внутри повтора) — лучший найденный',
    note: 'F1 можно звать прямо из тела повтора. Оптимум: 29 блоков.',
    blocks: 29,
    program: P(
      '{"main":[{"t":"F"},{"t":"R"},{"t":"repeat","n":6,"body":[{"t":"F"}]},{"t":"repeat","n":3,"body":[{"t":"R"},{"t":"F"}]},{"t":"repeat","n":5,"body":[{"t":"call","f":0},{"t":"R"}]},{"t":"repeat","n":3,"body":[{"t":"R"},{"t":"call","f":0}]},{"t":"repeat","n":2,"body":[{"t":"L"}]},{"t":"repeat","n":3,"body":[{"t":"F"}]},{"t":"call","f":0},{"t":"F"},{"t":"R"},{"t":"repeat","n":2,"body":[{"t":"call","f":0},{"t":"R"},{"t":"call","f":0}]},{"t":"repeat","n":4,"body":[{"t":"F"}]}],"funcs":[[{"t":"F"},{"t":"L"},{"t":"F"}],[]]}',
    ),
  },
  {
    title: 'ПОВТОР + две функции F1 и F2',
    note: 'Вызовы только в основной программе. Оптимум: 30 блоков.',
    blocks: 30,
    program: P(
      '{"main":[{"t":"call","f":0},{"t":"repeat","n":2,"body":[{"t":"F"}]},{"t":"call","f":0},{"t":"call","f":1},{"t":"call","f":0},{"t":"call","f":1},{"t":"call","f":0},{"t":"L"},{"t":"call","f":0},{"t":"call","f":1},{"t":"repeat","n":3,"body":[{"t":"R"},{"t":"F"},{"t":"F"}]},{"t":"call","f":1},{"t":"call","f":1},{"t":"F"},{"t":"call","f":0},{"t":"call","f":1},{"t":"call","f":0},{"t":"F"},{"t":"call","f":1}],"funcs":[[{"t":"F"},{"t":"R"},{"t":"F"}],[{"t":"L"},{"t":"F"},{"t":"F"},{"t":"L"}]]}',
    ),
  },
];

const DEFAULT_KEY = encodeLevel(defaultLevel());

export function isDefaultLevel(l: Level): boolean {
  return encodeLevel(l) === DEFAULT_KEY;
}
