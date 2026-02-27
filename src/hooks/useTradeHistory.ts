'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';

export interface TradeRecord {
  id: string;
  market: string;
  side: 'LONG' | 'SHORT';
  amount: number;
  fee: number;
  pnl: number;
  status: 'placed' | 'won' | 'lost' | 'pending';
  timestamp: number;
  txHash: string;
  marketId: string;
}

export function useTradeHistory() {
  const { address } = useAccount();
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setTrades([]);
      return;
    }

    setLoading(true);
    fetch(`/api/history?address=${address}`)
      .then(r => r.json())
      .then(data => {
        setTrades(data.trades || []);
      })
      .catch(() => setTrades([]))
      .finally(() => setLoading(false));
  }, [address]);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalFees = trades.reduce((s, t) => s + t.fee, 0);
  const wins = trades.filter(t => t.status === 'won').length;
  const losses = trades.filter(t => t.status === 'lost').length;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return { trades, loading, totalPnl, totalFees, winRate, wins, losses };
}
