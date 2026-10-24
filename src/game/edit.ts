import { MAX_FUNC_LEN, MAX_REPEAT_BODY, countBlocks, type Instr, type Program } from './types';

export type Scope = 'main' | 'f0' | 'f1';
export interface Target {
  scope: Scope;
  path: number[]; // индексы repeat-блоков, внутрь которых заходим
}

export const scopeTitle = (s: Scope) => (s === 'main' ? 'Основная программа' : s === 'f0' ? 'Функция F1' : 'Функция F2');

function rootList(p: Program, scope: Scope): Instr[] {
  return scope === 'main' ? p.main : scope === 'f0' ? p.funcs[0] : p.funcs[1];
}

export function targetExists(p: Program, t: Target): boolean {
  let list = rootList(p, t.scope);
  for (const i of t.path) {
    const ins = list[i];
    if (!ins || ins.t !== 'repeat') return false;
    list = ins.body;
  }
  return true;
}

export function getList(p: Program, t: Target): Instr[] {
  let list = rootList(p, t.scope);
  for (const i of t.path) {
    const ins = list[i];
    if (!ins || ins.t !== 'repeat') return list;
    list = ins.body;
  }
  return list;
}

function mapList(list: Instr[], path: number[], fn: (l: Instr[]) => Instr[]): Instr[] {
  if (!path.length) return fn(list);
  const [head, ...rest] = path;
  return list.map((ins, i) => {
    if (i !== head || ins.t !== 'repeat') return ins;
    return { ...ins, body: mapList(ins.body, rest, fn) };
  });
}

export function modifyList(p: Program, t: Target, fn: (l: Instr[]) => Instr[]): Program {
  if (t.scope === 'main') return { ...p, main: mapList(p.main, t.path, fn) };
  const fi = t.scope === 'f0' ? 0 : 1;
  const funcs = p.funcs.map((f, i) => (i === fi ? mapList(f, t.path, fn) : f));
  return { ...p, funcs };
}

/** Проверка ограничений: что можно положить в выбранный контейнер */
export function checkAdd(p: Program, t: Target, instr: Instr): string | null {
  const inRepeat = t.path.length > 0;
  if (instr.t === 'repeat' && inRepeat) return 'Повтор внутри повтора запрещён';
  if (instr.t === 'call') {
    if (t.scope === 'f0' && instr.f === 0) return 'Функция не может вызывать сама себя';
    if (t.scope === 'f1' && instr.f === 1) return 'Функция не может вызывать сама себя';
  }
  const list = getList(p, t);
  if (inRepeat) {
    const size = countBlocks(list);
    const add = countBlocks([instr]);
    if (size + add > MAX_REPEAT_BODY) return `В повторе максимум ${MAX_REPEAT_BODY} блока(ов)`;
  }
  if (t.scope !== 'main') {
    const fi = t.scope === 'f0' ? 0 : 1;
    const size = countBlocks(p.funcs[fi]);
    const add = countBlocks([instr]);
    if (size + add > MAX_FUNC_LEN) return `В функции максимум ${MAX_FUNC_LEN} блоков`;
  }
  return null;
}

export function addInstr(p: Program, t: Target, instr: Instr): Program {
  return modifyList(p, t, (l) => [...l, instr]);
}

export function removeInstr(p: Program, t: Target, index: number): Program {
  return modifyList(p, t, (l) => l.filter((_, i) => i !== index));
}

export function moveInstr(p: Program, t: Target, index: number, delta: number): Program {
  return modifyList(p, t, (l) => {
    const j = index + delta;
    if (j < 0 || j >= l.length) return l;
    const copy = [...l];
    const [it] = copy.splice(index, 1);
    copy.splice(j, 0, it);
    return copy;
  });
}

export function setRepeatN(p: Program, t: Target, index: number, n: number): Program {
  return modifyList(p, t, (l) =>
    l.map((ins, i) => (i === index && ins.t === 'repeat' ? { ...ins, n: Math.max(2, Math.min(99, n)) } : ins)),
  );
}

export function samePath(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
