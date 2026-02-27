'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { MarketRow } from '@/components/MarketRow';
import type { Market } from '@/lib/polymarket';

export default function Markets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/markets').then(r => r.json()).then(setMarkets).catch(() => {});
  }, []);

  const filtered = markets.filter(m => {
    if (filter === 'all') return true;
    return m.question.toLowerCase().includes(filter);
  });

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Crypto Markets</h1>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'btc', 'eth', 'sol'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f.toUpperCase()}
            </button>
          ))}
        </div>

        <Card className="p-0 overflow-hidden">
          {filtered.length > 0 ? (
            filtered.map(m => <MarketRow key={m.id} market={m} />)
          ) : (
            <div className="p-8 text-center text-[var(--muted)] font-mono text-sm">
              {markets.length === 0 ? 'Loading markets...' : 'No markets match filter'}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
