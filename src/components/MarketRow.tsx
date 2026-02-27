'use client';

import { useState } from 'react';
import type { Market } from '@/lib/polymarket';
import { formatPercent } from '@/lib/polymarket';
import { TradeModal } from './TradeModal';

function shortName(question: string): string {
  const coin = question.toLowerCase();
  let ticker = '';
  if (coin.includes('bitcoin')) ticker = 'BTC';
  else if (coin.includes('ethereum')) ticker = 'ETH';
  else if (coin.includes('solana')) ticker = 'SOL';
  else if (coin.includes('xrp')) ticker = 'XRP';
  else ticker = question.split(' ')[0];

  const timeMatch = question.match(/(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/);
  const timeRange = timeMatch ? `${timeMatch[1]}-${timeMatch[2]}` : '';

  return `${ticker} Up/Down ${timeRange}`;
}

export function MarketRow({ market }: { market: Market }) {
  const [tradeModal, setTradeModal] = useState<'UP' | 'DOWN' | null>(null);
  const upPrice = parseFloat(market.outcomePrices[0] || '0.5');
  const downPrice = parseFloat(market.outcomePrices[1] || '0.5');

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)] hover:bg-gray-900/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {market.image && (
            <img src={market.image} alt="" className="w-8 h-8 rounded-full shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold">{shortName(market.question)}</p>
            <p className="text-xs text-[var(--muted)] truncate">{market.question}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <button
            onClick={() => setTradeModal('UP')}
            className="px-3 py-1.5 rounded bg-[var(--green)]/10 border border-[var(--green)]/30 hover:bg-[var(--green)]/20 transition-colors"
          >
            <p className="text-[10px] text-[var(--muted)]">UP</p>
            <p className="font-mono text-sm font-bold text-[var(--green)]">{formatPercent(upPrice)}</p>
          </button>
          <button
            onClick={() => setTradeModal('DOWN')}
            className="px-3 py-1.5 rounded bg-[var(--red)]/10 border border-[var(--red)]/30 hover:bg-[var(--red)]/20 transition-colors"
          >
            <p className="text-[10px] text-[var(--muted)]">DOWN</p>
            <p className="font-mono text-sm font-bold text-[var(--red)]">{formatPercent(downPrice)}</p>
          </button>
        </div>
      </div>

      {tradeModal && (
        <TradeModal
          market={market}
          side={tradeModal}
          onClose={() => setTradeModal(null)}
        />
      )}
    </>
  );
}
