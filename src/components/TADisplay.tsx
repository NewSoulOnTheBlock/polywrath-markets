import type { TASnapshot } from '@/lib/ta-engine';
import { SignalBadge } from './SignalBadge';

function Indicator({ label, value, unit = '' }: { label: string; value: React.ReactNode; unit?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[var(--card-border)] last:border-0">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="font-mono text-sm">{value}{unit}</span>
    </div>
  );
}

export function TADisplay({ ta }: { ta: TASnapshot }) {
  const rsiColor = ta.rsi > 70 ? 'text-[var(--red)]' : ta.rsi < 30 ? 'text-[var(--green)]' : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Technical Analysis</h3>
        <SignalBadge signal={ta.signal} strength={ta.strength} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Prediction */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-xs text-[var(--muted)] mb-2">Prediction</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--green)]">LONG</span>
                <span className="font-mono">{ta.prediction.long}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--green)] rounded-full transition-all" style={{ width: `${ta.prediction.long}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--red)]">SHORT</span>
                <span className="font-mono">{ta.prediction.short}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--red)] rounded-full transition-all" style={{ width: `${ta.prediction.short}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Heiken Ashi */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-xs text-[var(--muted)] mb-2">Heiken Ashi</p>
          <p className={`text-lg font-bold ${ta.heikenAshi.trend === 'bullish' ? 'text-[var(--green)]' : ta.heikenAshi.trend === 'bearish' ? 'text-[var(--red)]' : 'text-[var(--yellow)]'}`}>
            {ta.heikenAshi.trend.toUpperCase()}
          </p>
          <p className="text-xs text-[var(--muted)] font-mono mt-1">
            O: {ta.heikenAshi.open.toFixed(2)} C: {ta.heikenAshi.close.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Indicators */}
      <div className="bg-gray-900/50 rounded-lg p-4">
        <Indicator label="RSI (14)" value={<span className={rsiColor}>{ta.rsi.toFixed(1)}</span>} />
        <Indicator label="MACD" value={ta.macd.value.toFixed(4)} />
        <Indicator label="MACD Signal" value={ta.macd.signal.toFixed(4)} />
        <Indicator label="MACD Histogram" value={ta.macd.histogram.toFixed(4)} />
        <Indicator label="VWAP" value={`$${ta.vwap.toFixed(2)}`} />
        <Indicator label="Delta 1m" value={ta.delta1m.toFixed(3)} unit="%" />
        <Indicator label="Delta 3m" value={ta.delta3m.toFixed(3)} unit="%" />
      </div>
    </div>
  );
}
