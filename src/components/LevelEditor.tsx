import { useState } from 'react';
import type { CellType, Dir, Level } from '../game/types';
import { cloneLevel, decodeLevel, defaultLevel, emptyLevel, encodeLevel, starIndices } from '../game/levels';
import type { Tool } from './GridView';
import { ExitDot, StarBlue, WallStar } from './icons';

interface Props {
  level: Level;
  setLevel: (l: Level) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
}

const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: 'empty', label: 'Пусто', icon: <span className="h-4 w-4 rounded-sm bg-white" /> },
  { id: 'wall', label: 'Препятствие', icon: <WallStar className="h-4 w-4" /> },
  { id: 'star', label: 'Звезда', icon: <StarBlue className="h-4 w-4" /> },
  { id: 'exit', label: 'Выход', icon: <ExitDot className="h-4 w-4" /> },
  { id: 'start', label: 'Робот / поворот', icon: <span className="text-sm leading-none">🤖</span> },
];

export default function LevelEditor({ level, setLevel, tool, setTool }: Props) {
  const [io, setIo] = useState('');

  const resize = (w: number, h: number) => {
    const next = emptyLevel(w, h);
    const cells: CellType[] = new Array(w * h).fill('empty');
    for (let y = 0; y < Math.min(h, level.h); y++)
      for (let x = 0; x < Math.min(w, level.w); x++) cells[y * w + x] = level.cells[y * level.w + x];
    next.cells = cells;
    next.start = { x: Math.min(level.start.x, w - 1), y: Math.min(level.start.y, h - 1) };
    next.dir = level.dir;
    setLevel(next);
  };

  const randomize = () => {
    const l = emptyLevel(level.w, level.h);
    const n = level.w * level.h;
    const wallCount = Math.round(n * 0.22);
    const forbidden = new Set<number>([l.start.y * l.w + l.start.x, l.w - 1]);
    l.cells[l.w - 1] = 'exit';
    let placed = 0;
    let guard = 0;
    while (placed < wallCount && guard++ < 2000) {
      const i = Math.floor(Math.random() * n);
      if (forbidden.has(i) || l.cells[i] !== 'empty') continue;
      l.cells[i] = 'wall';
      placed++;
    }
    let stars = 0;
    guard = 0;
    while (stars < 6 && guard++ < 2000) {
      const i = Math.floor(Math.random() * n);
      if (forbidden.has(i) || l.cells[i] !== 'empty') continue;
      l.cells[i] = 'star';
      stars++;
    }
    setLevel(l);
  };

  const rotateStart = () => {
    const l = cloneLevel(level);
    l.dir = (((l.dir + 1) % 4) as Dir);
    setLevel(l);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-bold tracking-wide text-white/70 uppercase">Инструмент</h3>
        <div className="flex flex-wrap gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={[
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                tool === t.id ? 'bg-white text-slate-900 shadow' : 'bg-white/10 text-white/80 hover:bg-white/20',
              ].join(' ')}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-white/45">
          Кликай по клеткам поля (можно рисовать с зажатой кнопкой мыши). Инструмент «Робот» ставит старт, повторный
          клик по той же клетке поворачивает робота.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-white/60 uppercase">Ширина: {level.w}</span>
          <input
            type="range"
            min={4}
            max={14}
            value={level.w}
            onChange={(e) => resize(Number(e.target.value), level.h)}
            className="accent-indigo-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-white/60 uppercase">Высота: {level.h}</span>
          <input
            type="range"
            min={4}
            max={14}
            value={level.h}
            onChange={(e) => resize(level.w, Number(e.target.value))}
            className="accent-indigo-400"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setLevel(defaultLevel())}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
        >
          Исходное поле задания
        </button>
        <button
          type="button"
          onClick={() => setLevel({ ...emptyLevel(level.w, level.h) })}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
        >
          Очистить
        </button>
        <button
          type="button"
          onClick={randomize}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
        >
          Случайное поле
        </button>
        <button
          type="button"
          onClick={rotateStart}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
        >
          Повернуть робота ↻
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/60 uppercase">Код поля (экспорт / импорт)</span>
          <span className="text-[11px] text-white/40">звёзд: {starIndices(level).length}</span>
        </div>
        <textarea
          value={io}
          onChange={(e) => setIo(e.target.value)}
          rows={3}
          placeholder="Нажми «Экспорт», чтобы получить код поля, или вставь код и нажми «Импорт»"
          className="w-full rounded-lg border border-white/15 bg-black/40 p-2 font-mono text-[10px] text-white/80 outline-none focus:border-indigo-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIo(encodeLevel(level))}
            className="rounded-lg bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
          >
            Экспорт
          </button>
          <button
            type="button"
            onClick={() => {
              const l = decodeLevel(io);
              if (l) setLevel(l);
              else alert('Не удалось разобрать код поля');
            }}
            className="rounded-lg bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
          >
            Импорт
          </button>
        </div>
      </div>
    </div>
  );
}
