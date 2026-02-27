'use client';

import { useAccount } from 'wagmi';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { SignalBadge } from '@/components/SignalBadge';
import { useTradeHistory } from '@/hooks/useTradeHistory';

export default function History() {
  const { isConnected } = useAccount();
  const { trades, loading, totalPnl, totalFees, winRate } = useTradeHistory();

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Trade History</h1>

        {!isConnected ? (
          <Card className="text-center py-12">
            <p className="text-[var(--muted)]">Connect your wallet to view trade history.</p>
          </Card>
        ) : loading ? (
          <Card className="text-center py-12">
            <p className="text-[var(--muted)] font-mono">Loading trades from Polygon...</p>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <p className="text-sm text-[var(--muted)]">Total P&L</p>
                <p className={`text-xl font-bold font-mono ${totalPnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-[var(--muted)]">Fees Paid</p>
                <p className="text-xl font-bold font-mono">${totalFees.toFixed(2)}</p>
              </Card>
              <Card>
                <p className="text-sm text-[var(--muted)]">Win Rate</p>
                <p className="text-xl font-bold font-mono">{winRate}%</p>
              </Card>
            </div>

            {/* Table */}
            {trades.length > 0 ? (
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-[var(--muted)]">
                      <th className="text-left px-5 py-3 font-medium">Market</th>
                      <th className="text-left px-5 py-3 font-medium">Side</th>
                      <th className="text-right px-5 py-3 font-medium">Amount</th>
                      <th className="text-right px-5 py-3 font-medium">P&L</th>
                      <th className="text-right px-5 py-3 font-medium">Fee</th>
                      <th className="text-right px-5 py-3 font-medium">Status</th>
                      <th className="text-right px-5 py-3 font-medium">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(trade => (
                      <tr key={trade.id} className="border-b border-[var(--card-border)] hover:bg-gray-900/30">
                        <td className="px-5 py-3">{trade.market}</td>
                        <td className="px-5 py-3"><SignalBadge signal={trade.side} strength={0} /></td>
                        <td className="px-5 py-3 text-right font-mono">${trade.amount.toFixed(2)}</td>
                        <td className={`px-5 py-3 text-right font-mono font-bold ${trade.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[var(--muted)]">${trade.fee.toFixed(2)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs font-mono ${
                            trade.status === 'won' ? 'text-[var(--green)]' :
                            trade.status === 'lost' ? 'text-[var(--red)]' :
                            'text-[var(--yellow)]'
                          }`}>
                            {trade.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <a
                            href={`https://polygonscan.com/tx/${trade.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-mono"
                          >
                            {trade.txHash.slice(0, 8)}...
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <p className="text-lg font-semibold mb-2">No trades yet</p>
                <p className="text-sm text-[var(--muted)]">
                  Deposit USDC and start the agent to begin trading. Your trade history will appear here, pulled directly from the Polygon blockchain.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
