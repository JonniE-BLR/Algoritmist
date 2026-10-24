import { MAX_FUNC_LEN, MAX_REPEAT_BODY, countBlocks, type Instr, type Program } from '../game/types';
import {
  addInstr,
  checkAdd,
  moveInstr,
  removeInstr,
  samePath,
  setRepeatN,
  targetExists,
  type Scope,
  type Target,
} from '../game/edit';
import { ArrowUp, LoopIcon, TurnLeft, TurnRight } from './icons';

interface Props {
  program: Program;
  setProgram: (p: Program) => void;
  target: Target;
  setTarget: (t: Target) => void;
  active: { scope: Scope; path: number[] } | null;
  locked: boolean;
  onError: (msg: string) => void;
}

const PALETTE: { instr: Instr; label: string; cls: string; icon: React.ReactNode }[] = [
  { instr: { t: 'F' }, label: 'Вперёд', cls: 'bg-emerald-500 hover:bg-emerald-400', icon: <ArrowUp className="h-4 w-4" /> },
  { instr: { t: 'L' }, label: 'Налево', cls: 'bg-sky-500 hover:bg-sky-400', icon: <TurnLeft className="h-4 w-4" /> },
  { instr: { t: 'R' }, label: 'Направо', cls: 'bg-amber-500 hover:bg-amber-400', icon: <TurnRight className="h-4 w-4" /> },
  { instr: { t: 'repeat', n: 2, body: [] }, label: 'Повтор N', cls: 'bg-violet-500 hover:bg-violet-400', icon: <LoopIcon className="h-4 w-4" /> },
  { instr: { t: 'call', f: 0 }, label: 'F1', cls: 'bg-pink-500 hover:bg-pink-400', icon: <span className="text-xs font-black">ƒ</span> },
  { instr: { t: 'call', f: 1 }, label: 'F2', cls: 'bg-rose-500 hover:bg-rose-400', icon: <span className="text-xs font-black">ƒ</span> },
];

function chipStyle(i: Instr) {
  switch (i.t) {
    case 'F':
      return 'bg-emerald-500/90 ring-emerald-300';
    case 'L':
      return 'bg-sky-500/90 ring-sky-300';
    case 'R':
      return 'bg-amber-500/90 ring-amber-300';
    case 'call':
      return i.f === 0 ? 'bg-pink-500/90 ring-pink-300' : 'bg-rose-500/90 ring-rose-300';
    case 'repeat':
      return 'bg-violet-500/90 ring-violet-300';
  }
}

function chipIcon(i: Instr) {
  switch (i.t) {
    case 'F':
      return <ArrowUp className="h-4 w-4" />;
    case 'L':
      return <TurnLeft className="h-4 w-4" />;
    case 'R':
      return <TurnRight className="h-4 w-4" />;
    case 'call':
      return <span className="text-sm font-black leading-none">F{i.f + 1}</span>;
    case 'repeat':
      return <LoopIcon className="h-4 w-4" />;
  }
}

export default function ProgramEditor({ program, setProgram, target, setTarget, active, locked, onError }: Props) {
  const add = (instr: Instr) => {
    let t = target;
    if (!targetExists(program, t)) {
      t = { scope: t.scope, path: [] };
      setTarget(t);
    }
    const err = checkAdd(program, t, instr);
    if (err) return onError(err);
    const copy: Instr = instr.t === 'repeat' ? { t: 'repeat', n: 2, body: [] } : { ...instr };
    setProgram(addInstr(program, t, copy));
  };

  const renderList = (scope: Scope, path: number[], list: Instr[]) => {
    const isFocused = target.scope === scope && samePath(target.path, path);
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!locked) setTarget({ scope, path });
        }}
        className={[
          'flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border p-1.5 transition',
          isFocused && !locked
            ? 'border-white/70 bg-white/10 ring-2 ring-white/40'
            : 'border-white/10 bg-black/20 hover:border-white/30',
        ].join(' ')}
      >
        {list.length === 0 && (
          <span className="px-1 text-xs text-white/35">
            {isFocused ? 'Выбрано — нажимай блоки слева' : 'пусто'}
          </span>
        )}
        {list.map((ins, i) => {
          const here = [...path, i];
          const isActive =
            active && active.scope === scope && active.path.length > path.length && active.path[path.length] === i;
          return (
            <div key={i} className="group relative">
              <div
                className={[
                  'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-white shadow ring-1',
                  chipStyle(ins),
                  isActive ? 'outline outline-2 outline-offset-2 outline-yellow-300' : '',
                ].join(' ')}
              >
                {chipIcon(ins)}
                {ins.t === 'repeat' && (
                  <span className="flex items-center gap-0.5">
                    ×
                    <button
                      type="button"
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProgram(setRepeatN(program, { scope, path }, i, ins.n - 1));
                      }}
                      className="rounded bg-black/25 px-1 leading-none hover:bg-black/50"
                    >
                      −
                    </button>
                    <span className="w-4 text-center tabular-nums">{ins.n}</span>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProgram(setRepeatN(program, { scope, path }, i, ins.n + 1));
                      }}
                      className="rounded bg-black/25 px-1 leading-none hover:bg-black/50"
                    >
                      +
                    </button>
                  </span>
                )}
                {ins.t === 'repeat' && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {renderList(scope, here, ins.body)}
                  </div>
                )}
              </div>
              {!locked && (
                <div className="absolute -top-2 -right-2 hidden gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    title="Влево"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProgram(moveInstr(program, { scope, path }, i, -1));
                    }}
                    className="h-4 w-4 rounded-full bg-slate-700 text-[9px] leading-none text-white hover:bg-slate-500"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    title="Вправо"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProgram(moveInstr(program, { scope, path }, i, 1));
                    }}
                    className="h-4 w-4 rounded-full bg-slate-700 text-[9px] leading-none text-white hover:bg-slate-500"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    title="Удалить"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProgram(removeInstr(program, { scope, path }, i));
                    }}
                    className="h-4 w-4 rounded-full bg-red-600 text-[9px] leading-none text-white hover:bg-red-500"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const section = (scope: Scope, title: string, limit?: number) => {
    const list = scope === 'main' ? program.main : program.funcs[scope === 'f0' ? 0 : 1];
    const used = countBlocks(list);
    return (
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-bold tracking-wide text-white/80 uppercase">{title}</h3>
          <span className={`text-[11px] tabular-nums ${limit && used > limit ? 'text-red-400' : 'text-white/45'}`}>
            {used}
            {limit ? ` / ${limit}` : ''} блок.
          </span>
        </div>
        {renderList(scope, [], list)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((p) => {
          const err = checkAdd(program, target, p.instr);
          return (
            <button
              key={p.label}
              type="button"
              disabled={locked}
              onClick={() => add(p.instr)}
              title={err ?? `Добавить: ${p.label}`}
              className={[
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shadow transition',
                p.cls,
                err ? 'opacity-35' : '',
                locked ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              {p.icon}
              {p.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-white/45">
        Кликни по рамке (основная программа, тело повтора или функция), чтобы выбрать, куда добавлять блоки.
        Ограничения: тело повтора ≤ {MAX_REPEAT_BODY} блоков, функция ≤ {MAX_FUNC_LEN} блоков, основная программа — без
        ограничений.
      </p>
      {section('main', 'Основная программа')}
      <div className="grid gap-3 sm:grid-cols-2">
        {section('f0', 'Функция F1', MAX_FUNC_LEN)}
        {section('f1', 'Функция F2', MAX_FUNC_LEN)}
      </div>
    </div>
  );
}
