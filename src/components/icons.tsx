export function StarBlue({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <path
        d="M50 2 C56 36 64 44 98 50 C64 56 56 64 50 98 C44 64 36 56 2 50 C36 44 44 36 50 2 Z"
        fill="#2b35d6"
        stroke="#1a1f8f"
        strokeWidth="2"
      />
    </svg>
  );
}

export function WallStar({ className = '' }: { className?: string }) {
  const pts: string[] = [];
  const cx = 50;
  const cy = 50;
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 48 : 20;
    const a = (Math.PI * 2 * i) / 16 - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <polygon points={pts.join(' ')} fill="#9b0f26" stroke="#6b0718" strokeWidth="2" />
    </svg>
  );
}

export function ExitDot({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="38" fill="#f79432" stroke="#c96a12" strokeWidth="3" />
    </svg>
  );
}

export function Robot({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="rbt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bdf96a" />
          <stop offset="100%" stopColor="#38c94a" />
        </linearGradient>
      </defs>
      <path d="M50 8 L92 92 L50 70 L8 92 Z" fill="url(#rbt)" stroke="#1d7a2b" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowUp({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function TurnLeft({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v5" />
    </svg>
  );
}

export function TurnRight({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0-6 6v5" />
    </svg>
  );
}

export function LoopIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
