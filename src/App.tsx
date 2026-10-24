import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridView, { type Tool } from './components/GridView';
import ProgramEditor from './components/ProgramEditor';
import LevelEditor from './components/LevelEditor';
import SolverPanel from './components/SolverPanel';
import { cloneLevel, defaultLevel, starIndices, validateLevel } from './game/levels';
import { simulate, type RunResult } from './game/sim';
import { emptyProgram, programBlocks, type Dir, type Level, type Program } from './game/types';
import type { Target } from './game/edit';
import { StarBlue } from './components/icons';

const SPEEDS = [
  { label: '0.5×', ms: 520 },
  { label: '1×', ms: 260 },
  { label: '2×', ms: 120 },
  { label: '4×', ms: 45 },
];

const PIN = '2710';

export default function App() {
  const [level, setLevel] = useState<Level>(() => defaultLevel());
  const [program, setProgram] = useState<Program>(() => emptyProgram());
  const [target, setTarget] = useState<Target>({ scope: 'main', path: [] });
  const [tab, setTab] = useState<'program' | 'editor' | 'secret'>('program');
  const [tool, setTool] = useState<Tool>('wall');
  const [run, setRun] = useState<RunResult | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  const stars = useMemo(() => starIndices(level), [level]);
  const levelError = validateLevel(level);
  const blocks = programBlocks(program);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setRun(null);
    setIdx(0);
  }, []);

  // сброс прогона при изменениях
  useEffect(() => {
    stop();
  }, [level, program, stop]);

  const startRun = () => {
    if (levelError) return showToast('Поле некорректно: ' + levelError);
    const r = simulate(level, program);
    setRun(r);
    setIdx(0);
    setPlaying(true);
  };

  const frames = run?.frames ?? null;

  useEffect(() => {
    if (!playing || !frames) return;
    if (idx >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setIdx((i) => Math.min(i + 1, frames.length - 1)), SPEEDS[speed].ms);
    return () => window.clearTimeout(t);
  }, [playing, idx, frames, speed]);

  // фиксируем рекорд
  useEffect(() => {
    if (!run || !frames) return;
    if (idx === frames.length - 1 && run.status === 'win') {
      setBestScore((b) => (b === null ? blocks : Math.min(b, blocks)));
    }
  }, [idx, run, frames, blocks]);

  const frame = frames ? frames[Math.min(idx, frames.length - 1)] : null;
  const trail = useMemo(() => {
    if (!frames) return [];
    return frames.slice(0, idx + 1).map((f) => f.y * level.w + f.x);
  }, [frames, idx, level.w]);

  const collected = frame ? countBits(frame.mask) : 0;
  const finished = !!frames && idx >= frames.length - 1;

  const paint = (x: number, y: number) => {
    const l = cloneLevel(level);
    const i = y * l.w + x;
    if (tool === 'start') {
      if (l.start.x === x && l.start.y === y) l.dir = (((l.dir + 1) % 4) as Dir);
      else {
        if (l.cells[i] === 'wall') l.cells[i] = 'empty';
        l.start = { x, y };
      }
    } else if (tool === 'exit') {
      l.cells = l.cells.map((c) => (c === 'exit' ? 'empty' : c));
      l.cells[i] = 'exit';
    } else {
      if (tool === 'wall' && l.start.x === x && l.start.y === y) {
        showToast('Нельзя ставить препятствие под роботом');
        return;
      }
      l.cells[i] = tool;
    }
    setLevel(l);
  };

  const statusColor =
    run?.status === 'win'
      ? 'text-emerald-300'
      : run?.status === 'crash'
        ? 'text-red-300'
        : run?.status === 'timeout'
          ? 'text-amber-300'
          : 'text-white/70';

  return (
    <div className="min-h-screen bg-[#0b1020] bg-[radial-gradient(60rem_40rem_at_15%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(50rem_30rem_at_110%_10%,rgba(236,72,153,0.18),transparent)] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Робот-алгоритмист <span className="text-indigo-400">·</span> оптимальная программа
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-white/55">
              Собери все звёзды, обойди красные препятствия и дойди до оранжевого выхода. Количество блоков в основной
              программе не ограничено, но в повторе — не больше 4 блоков, а в каждой из двух функций — не больше 5.
              Цель: решить за минимальное число блоков.
            </p>
          </div>
          <div className="flex gap-3">
            <Stat label="Блоков" value={blocks} />
            <Stat label="Звёзды" value={`${collected}/${stars.length}`} />
            <Stat label="Рекорд" value={bestScore ?? '—'} accent />
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(380px,640px)_minmax(0,1fr)]">
          {/* ЛЕВО: поле + управление */}
          <div className="space-y-4">
            <GridView
              level={level}
              frame={frame}
              trail={tab === 'editor' ? [] : trail}
              editMode={tab === 'editor'}
              tool={tool}
              onPaint={paint}
            />

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
              <button
                type="button"
                onClick={() => (run ? setPlaying((p) => !p) : startRun())}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400"
              >
                {run && playing ? '⏸ Пауза' : run && !finished ? '▶ Продолжить' : '▶ Запустить'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!run) {
                    const r = simulate(level, program);
                    setRun(r);
                    setIdx(1 > r.frames.length - 1 ? r.frames.length - 1 : 1);
                    return;
                  }
                  setPlaying(false);
                  setIdx((i) => Math.min(i + 1, (frames?.length ?? 1) - 1));
                }}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20"
              >
                ⏭ Шаг
              </button>
              <button
                type="button"
                onClick={stop}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20"
              >
                ⏹ Сброс
              </button>
              <div className="ml-auto flex items-center gap-1">
                {SPEEDS.map((s, i) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSpeed(i)}
                    className={[
                      'rounded-lg px-2 py-1 text-xs font-bold transition',
                      speed === i ? 'bg-white text-slate-900' : 'bg-white/10 text-white/70 hover:bg-white/20',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
              {levelError ? (
                <span className="text-amber-300">⚠ {levelError}</span>
              ) : run ? (
                <div className="space-y-1">
                  <div className={`font-semibold ${statusColor}`}>
                    {finished
                      ? run.status === 'win'
                        ? `🏆 ${run.message} Использовано блоков: ${blocks}.`
                        : run.status === 'crash'
                          ? `💥 ${run.message}`
                          : `⛔ ${run.message}`
                      : `▶ Выполнение… шаг ${idx} из ${(frames?.length ?? 1) - 1}`}
                  </div>
                  {frame?.note && !finished && <div className="text-xs text-white/50">Команда: {frame.note}</div>}
                </div>
              ) : (
                <span className="text-white/55">
                  Собери программу справа и нажми «Запустить». Робот стартует из клетки ({level.start.x},{' '}
                  {level.start.y}).
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/55">
              <div className="mb-2 flex items-center gap-2 font-bold text-white/80">
                <StarBlue className="h-4 w-4" /> Правила
              </div>
              <ul className="list-inside list-disc space-y-1">
                <li>«Вперёд» — шаг на клетку по направлению робота; стена или край поля = авария.</li>
                <li>Звезда собирается автоматически при наезде на клетку.</li>
                <li>Уровень засчитан, когда робот стоит на выходе и собраны все звёзды.</li>
                <li>Счёт = общее число блоков: основная программа + тела функций (повтор считается за 1 блок + тело).</li>
              </ul>
            </div>
          </div>

          {/* ПРАВО: вкладки */}
          <div className="space-y-4">
            <div className="flex gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5">
              <TabBtn active={tab === 'program'} onClick={() => setTab('program')}>
                🧩 Программа
              </TabBtn>
              <TabBtn active={tab === 'editor'} onClick={() => setTab('editor')}>
                🛠 Редактор поля
              </TabBtn>
              <TabBtn active={tab === 'secret'} onClick={() => setTab('secret')}>
                🔐 Решения (PIN)
              </TabBtn>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              {tab === 'program' && (
                <div className="space-y-4">
                  <ProgramEditor
                    program={program}
                    setProgram={setProgram}
                    target={target}
                    setTarget={setTarget}
                    active={frame && !finished ? { scope: frame.scope ?? 'main', path: frame.path ?? [] } : null}
                    locked={false}
                    onError={showToast}
                  />
                  <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => setProgram(emptyProgram())}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                    >
                      Очистить всё
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(JSON.stringify(program));
                        showToast('Программа скопирована в буфер обмена');
                      }}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                    >
                      Копировать код
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const s = window.prompt('Вставь код программы (JSON)');
                        if (!s) return;
                        try {
                          const p = JSON.parse(s) as Program;
                          if (!p.main) throw new Error('bad');
                          setProgram({ main: p.main, funcs: p.funcs ?? [[], []] });
                        } catch {
                          showToast('Не удалось разобрать код программы');
                        }
                      }}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                    >
                      Вставить код
                    </button>
                  </div>
                </div>
              )}

              {tab === 'editor' && (
                <LevelEditor level={level} setLevel={setLevel} tool={tool} setTool={setTool} />
              )}

              {tab === 'secret' &&
                (unlocked ? (
                  <SolverPanel
                    level={level}
                    onLoad={(p) => {
                      setProgram(p);
                      setTab('program');
                      showToast('Программа загружена в редактор');
                    }}
                  />
                ) : (
                  <div className="mx-auto max-w-sm space-y-3 py-10 text-center">
                    <div className="text-4xl">🔐</div>
                    <h3 className="text-lg font-bold">Раздел для преподавателя</h3>
                    <p className="text-sm text-white/55">
                      Введи PIN-код, чтобы увидеть эталонные оптимальные решения и запустить решатель-переборщик.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (pin.trim() === PIN) {
                          setUnlocked(true);
                          showToast('Доступ открыт');
                        } else showToast('Неверный PIN-код');
                      }}
                      className="flex gap-2"
                    >
                      <input
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        inputMode="numeric"
                        placeholder="PIN"
                        className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-indigo-400"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold hover:bg-indigo-400"
                      >
                        Войти
                      </button>
                    </form>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xl ring-1 ring-white/20">
          {toast}
        </div>
      )}
    </div>
  );
}

function countBits(n: number) {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={[
        'min-w-[88px] rounded-xl border px-3 py-2 text-center',
        accent ? 'border-amber-300/30 bg-amber-400/10' : 'border-white/10 bg-white/5',
      ].join(' ')}
    >
      <div className="text-[10px] font-bold tracking-wider text-white/45 uppercase">{label}</div>
      <div className="text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 rounded-xl px-3 py-2 text-sm font-bold transition',
        active ? 'bg-white text-slate-900 shadow' : 'text-white/70 hover:bg-white/10',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
