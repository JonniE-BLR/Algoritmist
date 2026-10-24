import { useRef, useState } from 'react';
import type { Level, Program } from '../game/types';
import { DEFAULT_OPTIONS, solveLevel, type Progress, type SolveOutcome, type SolverOptions } from '../game/solver';
import { programToText, simulate } from '../game/sim';
import { validateLevel } from '../game/levels';
import { REFERENCE_SOLUTIONS, isDefaultLevel } from '../game/reference';
import { programBlocks } from '../game/types';

interface Props {
  level: Level;
  onLoad: (p: Program) => void;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-white/60 uppercase">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-white/35">{hint}</span>}
    </label>
  );
}

const selCls =
  'rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-sm text-white outline-none focus:border-indigo-400';

export default function SolverPanel({ level, onLoad }: Props) {
  const [opts, setOpts] = useState<SolverOptions>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<SolveOutcome | null>(null);
  const cancelRef = useRef(false);

  const defaultLvl = isDefaultLevel(level);

  const run = async () => {
    const err = validateLevel(level);
    if (err) {
      alert('Поле некорректно: ' + err);
      return;
    }
    setBusy(true);
    setResult(null);
    cancelRef.current = false;
    const out = await solveLevel(level, opts, setProgress, () => cancelRef.current);
    setResult(out);
    setBusy(false);
    setProgress(null);
  };

  const pct = progress && progress.total > 1 ? Math.round((progress.tried / progress.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-4">
        <h3 className="text-sm font-bold text-indigo-200">🤖 Решатель: полный перебор алгоритмов</h3>
        <p className="text-[11px] leading-relaxed text-white/50">
          Алгоритм строит граф всех состояний робота (клетка × направление × набор собранных звёзд) и ищет программу
          минимальной длины методом Дейкстры по блокам: «вперёд/поворот» = 1 блок, «повтор N раз» = 1 + длина тела,
          «вызов функции» = 1 блок + тело функции (один раз). Тела функций перебираются полностью.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Функции">
            <select
              className={selCls}
              value={opts.funcs}
              onChange={(e) => setOpts({ ...opts, funcs: Number(e.target.value) as 0 | 1 | 2 })}
            >
              <option value={0}>Без функций</option>
              <option value={1}>Одна (F1)</option>
              <option value={2}>Две (F1 + F2) — долго</option>
            </select>
          </Field>
          <Field label="Блоков в функции">
            <select
              className={selCls}
              value={opts.maxFuncLen}
              onChange={(e) => setOpts({ ...opts, maxFuncLen: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  до {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Блоков в повторе">
            <select
              className={selCls}
              value={opts.maxRepeatBody}
              onChange={(e) => setOpts({ ...opts, maxRepeatBody: Number(e.target.value) })}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  до {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Максимум N в повторе">
            <select
              className={selCls}
              value={opts.maxRepeatN}
              onChange={(e) => setOpts({ ...opts, maxRepeatN: Number(e.target.value) })}
            >
              {[4, 6, 8, 10, 12, 16, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={opts.callsInRepeat}
            onChange={(e) => setOpts({ ...opts, callsInRepeat: e.target.checked })}
            className="h-4 w-4 accent-indigo-500"
          />
          Разрешить вызовы функций внутри повтора (сильнее сжимает программу, перебор дольше)
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy ? 'Идёт перебор…' : 'Найти оптимальный алгоритм'}
          </button>
          {busy && (
            <button
              type="button"
              onClick={() => (cancelRef.current = true)}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
            >
              Стоп
            </button>
          )}
        </div>

        {progress && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-white/50">
              <span>{progress.stage}</span>
              <span>
                {progress.tried}/{progress.total} · лучшее: {progress.best ?? '—'} блок.
              </span>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
            {result.best ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-300">
                    Оптимум: {result.best.blocks} блоков ({result.best.label})
                  </span>
                  <span className="text-[11px] text-white/40">
                    {(result.ms / 1000).toFixed(1)} c · вариантов: {result.tried}
                  </span>
                </div>
                {result.baseline && result.baseline.blocks !== result.best.blocks && (
                  <div className="text-[11px] text-white/45">
                    Без функций лучшее: {result.baseline.blocks} блоков.
                  </div>
                )}
                <pre className="max-h-48 overflow-auto rounded-lg bg-black/50 p-2 text-[11px] leading-relaxed whitespace-pre-wrap text-emerald-100">
                  {programToText(result.best.program)}
                </pre>
                <div className="text-[11px] text-white/40">
                  Проверка симулятором: {simulate(level, result.best.program).status === 'win' ? '✅ проходит уровень' : '⚠️ ошибка'} ·
                  блоков в редакторе: {programBlocks(result.best.program)}
                </div>
                <button
                  type="button"
                  onClick={() => onLoad(result.best!.program)}
                  className="w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-400"
                >
                  Загрузить в редактор
                </button>
              </>
            ) : (
              <div className="text-sm text-amber-300">Решение не найдено в заданных ограничениях.</div>
            )}
            {result.cancelled && <div className="text-[11px] text-amber-300">Перебор остановлен вручную.</div>}
            {result.notes.map((n, i) => (
              <div key={i} className="text-[11px] text-white/40">
                ⚠ {n}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-white/80">📘 Эталонные решения классического поля</h3>
        {!defaultLvl && (
          <p className="text-[11px] text-amber-300/80">
            Поле изменено — эталоны ниже относятся к исходному полю задания. Для своего поля запусти решатель.
          </p>
        )}
        {REFERENCE_SOLUTIONS.map((s) => (
          <div key={s.title} className="space-y-1 rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white/85">{s.title}</span>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold text-indigo-200">
                {s.blocks} блоков
              </span>
            </div>
            <p className="text-[10px] text-white/40">{s.note}</p>
            <pre className="max-h-32 overflow-auto rounded-lg bg-black/50 p-2 text-[10px] leading-relaxed whitespace-pre-wrap text-sky-100">
              {programToText(s.program)}
            </pre>
            <button
              type="button"
              onClick={() => onLoad(s.program)}
              className="w-full rounded-lg bg-white/10 px-3 py-1 text-[11px] font-bold text-white hover:bg-white/20"
            >
              Загрузить в редактор
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
