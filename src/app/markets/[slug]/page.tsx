'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { TADisplay } from '@/components/TADisplay';
import { formatPercent } from '@/lib/polymarket';
import type { Market } from '@/lib/polymarket';
import type { TASnapshot } from '@/lib/ta-engine';

// Mock TA data for MVP
const mockTA: TASnapshot = {
  rsi: 42.5,
  macd: { value: 0.0023, signal: 0.0018, histogram: 0.0005 },
  vwap: 67842.50,
  heikenAshi: { open: 67800, high: 67900, low: 67750, close: 67860, trend: 'bullish' },
  delta1m: 0.12,
  delta3m: 0.34,
  prediction: { long: 65, short: 35 },
  signal: 'LONG',
  strength: 30,
};

export default function MarketDetail() {
  const params = useParams();
  const slug = params.slug as string;
  const [market, setMarket] = useState<Market | null>(null);

  useEffect(() => {
    fetch(`/api/market/${slug}`).then(r => r.json()).then(setMarket).catch(() => {});
  }, [slug]);

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {market ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">{market.question}</h1>
              <p className="text-sm text-[var(--muted)]">
                Volume: ${parseFloat(market.volume).toLocaleString()} | 
                Liquidity: ${parseFloat(market.liquidity).toLocaleString()}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Prices */}
              <div className="lg:col-span-1">
                <Card>
                  <h3 className="font-semibold mb-4">Current Prices</h3>
                  <div className="space-y-3">
                    {market.outcomes.map((outcome, i) => (
                      <div key={outcome} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                        <span className="text-sm">{outcome}</span>
                        <span className={`font-mono font-bold ${i === 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {formatPercent(market.outcomePrices[i])}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Trade */}
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm text-[var(--muted)]">Quick Trade</h4>
                    <input
                      type="number"
                      placeholder="Amount (USDC)"
                      className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button className="py-2.5 rounded-lg bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30 text-sm font-medium hover:bg-[var(--green)]/20 transition-colors">
                        Buy UP
                      </button>
                      <button className="py-2.5 rounded-lg bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30 text-sm font-medium hover:bg-[var(--red)]/20 transition-colors">
                        Buy DOWN
                      </button>
                    </div>
                    <p className="text-xs text-[var(--muted)] text-center">1% agent fee applied</p>
                  </div>
                </Card>
              </div>

              {/* TA */}
              <div className="lg:col-span-2">
                <Card>
                  <TADisplay ta={mockTA} />
                </Card>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-[var(--muted)] font-mono">Loading market...</div>
        )}
      </div>
    </>
  );
}
