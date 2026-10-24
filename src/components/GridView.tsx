import { useMemo } from 'react';
import type { Dir, Level } from '../game/types';
import { starIndices } from '../game/levels';
import type { Frame } from '../game/sim';
import { ExitDot, Robot, StarBlue, WallStar } from './icons';

export type Tool = 'empty' | 'wall' | 'star' | 'exit' | 'start';

interface Props {
  level: Level;
  frame: Frame | null;
  trail: number[];
  editMode: boolean;
  tool: Tool;
  onPaint: (x: number, y: number) => void;
}

export default function GridView({ level, frame, trail, editMode, tool, onPaint }: Props) {
  const stars = useMemo(() => starIndices(level), [level]);
  const mask = frame ? frame.mask : 0;
  const rx = frame ? frame.x : level.start.x;
  const ry = frame ? frame.y : level.start.y;
  const rdir: Dir = frame ? frame.dir : level.dir;

  const trailSet = useMemo(() => new Set(trail), [trail]);
  const cellPct = 100 / level.w;
  const cellPctY = 100 / level.h;

  return (
    <div className="rounded-2xl bg-[#4a4a4a] p-3 shadow-2xl shadow-black/40 ring-1 ring-white/10">
      <div
        className="relative w-full select-none"
        style={{ aspectRatio: `${level.w} / ${level.h}` }}
      >
        <div
          className="grid h-full w-full gap-[2px] bg-[#1b1b1b] p-[2px]"
          style={{ gridTemplateColumns: `repeat(${level.w}, minmax(0, 1fr))` }}
        >
          {level.cells.map((c, i) => {
            const x = i % level.w;
            const y = Math.floor(i / level.w);
            const isStart = level.start.x === x && level.start.y === y;
            const starIdx = stars.indexOf(i);
            const collected = starIdx >= 0 && (mask >> starIdx) & 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() => editMode && onPaint(x, y)}
                onMouseEnter={(e) => {
                  if (editMode && e.buttons === 1) onPaint(x, y);
                }}
                className={[
                  'relative flex items-center justify-center bg-white transition-colors',
                  editMode ? 'cursor-crosshair hover:bg-sky-100' : 'cursor-default',
                  trailSet.has(i) ? 'bg-emerald-50' : '',
                ].join(' ')}
                title={editMode ? `(${x}, ${y}) — ${tool}` : undefined}
              >
                {trailSet.has(i) && (
                  <span className="absolute h-[22%] w-[22%] rounded-full bg-emerald-400/40" />
                )}
                {c === 'wall' && <WallStar className="h-[86%] w-[86%]" />}
                {c === 'star' && !collected && <StarBlue className="h-[72%] w-[72%]" />}
                {c === 'star' && !!collected && (
                  <StarBlue className="h-[52%] w-[52%] opacity-15 grayscale" />
                )}
                {c === 'exit' && <ExitDot className="h-[78%] w-[78%]" />}
                {isStart && editMode && (
                  <span className="absolute inset-0 border-[3px] border-dashed border-lime-500/70" />
                )}
              </button>
            );
          })}
        </div>

        {/* Робот */}
        <div
          className="pointer-events-none absolute transition-all duration-150 ease-linear"
          style={{
            left: `${rx * cellPct}%`,
            top: `${ry * cellPctY}%`,
            width: `${cellPct}%`,
            height: `${cellPctY}%`,
          }}
        >
          <div
            className="flex h-full w-full items-center justify-center transition-transform duration-150"
            style={{ transform: `rotate(${rdir * 90}deg)` }}
          >
            <Robot className="h-[76%] w-[76%] drop-shadow" />
          </div>
        </div>

        {frame?.status === 'crash' && (
          <div className="pointer-events-none absolute inset-0 animate-pulse rounded-lg ring-4 ring-red-500" />
        )}
        {frame?.status === 'win' && (
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-4 ring-emerald-400" />
        )}
      </div>
    </div>
  );
}
