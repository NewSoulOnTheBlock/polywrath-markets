'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Navbar } from '@/components/Navbar';
import { Card, StatCard } from '@/components/Card';
import { MarketRow } from '@/components/MarketRow';
import { DepositModal } from '@/components/DepositModal';
import { useVaultBalance } from '@/hooks/useVault';
import { useAgent } from '@/context/AgentContext';
import type { Market } from '@/lib/polymarket';
import type { MarketContext } from '@/lib/market-context';
import { fetchMarketContext } from '@/lib/market-context';

export default function Dashboard() {
  const { isConnected } = useAccount();
  const vault = useVaultBalance();
  const { active: agentActive, logs: agentLogs, toggleAgent } = useAgent();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [depositModal, setDepositModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);

  useEffect(() => {
    fetch('/api/markets').then(r => r.json()).then(setMarkets).catch(() => {});
  }, []);

  useEffect(() => {
    // Poll external data sources every 15s for dashboard/debugging
    let active = true;
    const load = async () => {
      try {
        const ctx = await fetchMarketContext();
        if (active) setMarketContext(ctx);
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!isConnected) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-[var(--muted)]">Connect a wallet on Polygon to access the dashboard.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Wallet USDC" value={`$${vault.walletUSDC}`} />
          <StatCard label="Vault Balance" value={`$${vault.available}`} />
          <StatCard label="Locked in Trades" value={`$${vault.locked}`} />
          <StatCard label="Total Deposited" value={`$${vault.totalDeposited}`} />
          <StatCard label="Fees Paid" value={`$${vault.totalFeesPaid}`} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setDepositModal('deposit')}
            className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            Deposit USDC
          </button>
          <button
            onClick={() => setDepositModal('withdraw')}
            className="px-5 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-gray-900 transition-colors"
          >
            Withdraw
          </button>
          <div className="flex-1" />
          <button
            onClick={() => toggleAgent(markets.length, vault.available)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              agentActive
                ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                : 'bg-gray-800 text-[var(--muted)] border border-[var(--card-border)]'
            }`}
          >
            {agentActive ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Markets */}
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center justify-between">
                <h2 className="font-semibold">Crypto Short-Term Markets</h2>
                <span className="text-xs text-[var(--muted)] font-mono">{markets.length} active</span>
              </div>
              {markets.length > 0 ? (
                markets.slice(0, 15).map(m => <MarketRow key={m.id} market={m} />)
              ) : (
                <div className="p-8 text-center text-[var(--muted)]">
                  <p className="font-mono text-sm">Loading markets...</p>
                </div>
              )}
            </Card>
          </div>

          {/* Activity Feed */}
          <div>
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center justify-between">
                <h2 className="font-semibold">Agent Console</h2>
                <span className={`text-xs font-mono ${agentActive ? 'text-[var(--green)]' : 'text-[var(--muted)]'}`}>
                  {agentActive ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <div className="h-64 overflow-y-auto bg-black/40 font-mono text-xs p-3 space-y-1">
                {agentLogs.length > 0 ? (
                  agentLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[var(--muted)] shrink-0">[{log.time}]</span>
                      <span className={
                        log.type === 'success' ? 'text-[var(--green)]' :
                        log.type === 'warn' ? 'text-[var(--yellow)]' :
                        log.type === 'error' ? 'text-[var(--red)]' :
                        'text-gray-300'
                      }>{log.msg}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[var(--muted)] text-center pt-24">
                    Press Start Bot to activate the agent.
                  </div>
                )}
              </div>
            </Card>

            {/* External Data Debug Panel */}
            <Card className="mt-4 p-4">
              <h3 className="font-semibold mb-3">Market Data (Phase 1)</h3>
              {marketContext ? (
                <div className="space-y-3 text-xs font-mono text-[var(--muted)]">
                  {marketContext.coinbase && (
                    <div>
                      <p className="text-[var(--muted)] mb-1">Coinbase BTC-USD</p>
                      <p>Spot {marketContext.coinbase.price.toFixed(2)} | Bid {marketContext.coinbase.bid.toFixed(2)} | Ask {marketContext.coinbase.ask.toFixed(2)}</p>
                      <p>Vol24h {marketContext.coinbase.volume24h.toFixed(2)}</p>
                    </div>
                  )}
                  {marketContext.binance && (
                    <div>
                      <p className="text-[var(--muted)] mb-1 mt-2">Binance BTCUSDT (last {marketContext.binance.windowSeconds}s)</p>
                      <p>Last {marketContext.binance.lastPrice.toFixed(2)} | VWAP {marketContext.binance.vwapWindow?.toFixed(2) ?? 'n/a'}</p>
                      <p>Buys {marketContext.binance.buyVolumeWindow.toFixed(3)} / Sells {marketContext.binance.sellVolumeWindow.toFixed(3)} (trades {marketContext.binance.tradesWindow})</p>
                    </div>
                  )}
                  {marketContext.fearGreed && (
                    <div>
                      <p className="text-[var(--muted)] mb-1 mt-2">Fear &amp; Greed Index</p>
                      <p>Value {marketContext.fearGreed.value} ({marketContext.fearGreed.classification})</p>
                    </div>
                  )}
                  {marketContext.solana && (
                    <div>
                      <p className="text-[var(--muted)] mb-1 mt-2">Solana</p>
                      <p>Slot {marketContext.solana.slot}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">Loading external data...</p>
              )}
            </Card>

            {/* Agent Status */}
            <Card className="mt-4">
              <h3 className="font-semibold mb-3">Wrath Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Status</span>
                  <span className={agentActive ? 'text-[var(--green)]' : 'text-[var(--muted)]'}>
                    {agentActive ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Risk Level</span>
                  <span>Moderate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Trade Fee</span>
                  <span className="font-mono">1.0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Markets Scanned</span>
                  <span className="font-mono">{markets.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {depositModal && <DepositModal mode={depositModal} onClose={() => setDepositModal(null)} />}
    </>
  );
}
