'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from './Card';
import { useVaultBalance } from '@/hooks/useVault';
import { useAgent } from '@/context/AgentContext';
import type { Market } from '@/lib/polymarket';

interface TradeModalProps {
  market: Market;
  side: 'UP' | 'DOWN';
  onClose: () => void;
}

export function TradeModal({ market, side, onClose }: TradeModalProps) {
  const { address } = useAccount();
  const vault = useVaultBalance();
  const { logs } = useAgent();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'confirming' | 'submitted' | 'error'>('input');
  const [result, setResult] = useState<string>('');

  const outcomeIndex = side === 'UP' ? 0 : 1;
  const price = parseFloat(market.outcomePrices[outcomeIndex] || '0.5');
  const shares = amount ? parseFloat(amount) / price : 0;
  const fee = amount ? parseFloat(amount) * 0.01 : 0;
  const total = amount ? parseFloat(amount) + fee : 0;
  const tokenId = (() => {
    // We need the CLOB token ID - fetch from market data
    // For now we'll pass the market ID and resolve server-side
    return market.id;
  })();

  const handleTrade = async () => {
    if (!address || !amount) return;
    setStep('confirming');

    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          side: 'BUY',
          amount: parseFloat(amount),
          price,
          userAddress: address,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep('submitted');
        setResult(`Order submitted. Shares: ${data.order?.shares || shares.toFixed(2)}`);
      } else {
        setStep('error');
        setResult(data.message || data.error || 'Trade failed');
      }
    } catch (err) {
      setStep('error');
      setResult(err instanceof Error ? err.message : 'Network error');
    }
  };

  const available = parseFloat(vault.available);
  const amountNum = parseFloat(amount) || 0;
  const canTrade = amountNum > 0 && amountNum <= available;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-md w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {step === 'submitted' ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3 text-[var(--green)]">&#10003;</div>
            <h2 className="text-xl font-bold mb-2">Trade Submitted</h2>
            <p className="text-sm text-[var(--muted)] mb-4">{result}</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium">
              Close
            </button>
          </div>
        ) : step === 'error' ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">&#10007;</div>
            <h2 className="text-xl font-bold mb-2 text-[var(--red)]">Trade Failed</h2>
            <p className="text-sm text-[var(--muted)] mb-4 break-all">{result}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setStep('input')} className="px-6 py-2.5 rounded-lg border border-[var(--card-border)] text-sm">
                Try Again
              </button>
              <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium">
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              {market.image && <img src={market.image} alt="" className="w-10 h-10 rounded-full" />}
              <div>
                <h2 className="text-lg font-bold">
                  {side === 'UP' ? 'Buy UP' : 'Buy DOWN'}
                </h2>
                <p className="text-xs text-[var(--muted)]">{market.question}</p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-3 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Price</span>
                <span className="font-mono">{(price * 100).toFixed(1)}c</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Vault Balance</span>
                <span className="font-mono">${vault.available}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-[var(--muted)] mb-1 block">Amount (USDC)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={step === 'confirming'}
                  className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-3 font-mono text-lg focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => setAmount(vault.available)}
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  MAX
                </button>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">USDC</span>
              </div>
            </div>

            {amountNum > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-3 mb-4 space-y-1 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Shares</span>
                  <span>{shares.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Fee (1%)</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--green)]">
                  <span>Potential Payout</span>
                  <span>${shares.toFixed(2)}</span>
                </div>
              </div>
            )}

            {amountNum > available && available > 0 && (
              <p className="text-xs text-red-400 mb-3">Insufficient vault balance.</p>
            )}
            {available === 0 && (
              <p className="text-xs text-red-400 mb-3">No vault balance. Deposit USDC first.</p>
            )}

            {step === 'confirming' && (
              <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                <p className="text-sm font-mono animate-pulse">Submitting to Polymarket CLOB...</p>
              </div>
            )}

            {/* Agent log preview */}
            {logs.length > 0 && (
              <div className="mb-4 max-h-16 overflow-hidden">
                <p className="text-[10px] font-mono text-[var(--muted)]">
                  [{logs[0]?.time}] {logs[0]?.msg}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={step === 'confirming'}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTrade}
                disabled={!canTrade || step === 'confirming'}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  side === 'UP' ? 'bg-[var(--green)] hover:bg-green-600' : 'bg-[var(--red)] hover:bg-red-600'
                }`}
              >
                {step === 'confirming' ? 'Submitting...' : `Confirm ${side}`}
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
