export function SignalBadge({ signal, strength }: { signal: 'LONG' | 'SHORT' | 'NEUTRAL'; strength: number }) {
  const colors = {
    LONG: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30',
    SHORT: 'bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/30',
    NEUTRAL: 'bg-[var(--yellow)]/10 text-[var(--yellow)] border-[var(--yellow)]/30',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${colors[signal]}`}>
      <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${signal === 'LONG' ? 'bg-[var(--green)]' : signal === 'SHORT' ? 'bg-[var(--red)]' : 'bg-[var(--yellow)]'}`} />
      {signal} {strength}%
    </span>
  );
}
