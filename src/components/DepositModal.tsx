'use client';

import { useState, useEffect } from 'react';
import { Card } from './Card';
import { useVaultBalance, useApproveUSDC, useDeposit, useWithdraw } from '@/hooks/useVault';

export function DepositModal({ mode, onClose }: { mode: 'deposit' | 'withdraw'; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approving' | 'executing' | 'done'>('input');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_txErr, setTxErr] = useState<string | null>(null);

  const vault = useVaultBalance();
  const { approve, isPending: approving, isConfirming: confirmingApproval, isSuccess: approved, error: approveError } = useApproveUSDC();
  const { deposit, isPending: depositing, isConfirming: confirmingDeposit, isSuccess: deposited, error: depositError } = useDeposit();
  const { withdraw, isPending: withdrawing, isConfirming: confirmingWithdraw, isSuccess: withdrawn, error: withdrawError } = useWithdraw();

  const isLoading = approving || confirmingApproval || depositing || confirmingDeposit || withdrawing || confirmingWithdraw;
  const txError = approveError || depositError || withdrawError;

  // After approval, execute deposit
  useEffect(() => {
    if (approved && step === 'approving') {
      setStep('executing');
      deposit(amount);
    }
  }, [approved, step, amount, deposit]);

  // After deposit/withdraw complete
  useEffect(() => {
    if (deposited || withdrawn) {
      setStep('done');
      vault.refetch();
    }
  }, [deposited, withdrawn, vault]);

  // Reset step on error so button re-enables
  useEffect(() => {
    if (txError && step !== 'input') {
      setStep('input');
    }
  }, [txError, step]);

  const handleSubmit = () => {
    if (mode === 'deposit') {
      const needsApproval = parseFloat(vault.allowance) < parseFloat(amount);
      if (needsApproval) {
        setStep('approving');
        approve(amount);
      } else {
        setStep('executing');
        deposit(amount);
      }
    } else {
      setStep('executing');
      withdraw(amount);
    }
  };

  const maxAmount = mode === 'deposit' ? vault.walletUSDC : vault.available;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-md w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {step === 'done' ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">&#10003;</div>
            <h2 className="text-xl font-bold mb-2">
              {mode === 'deposit' ? 'Deposited' : 'Withdrawn'} ${amount} USDC
            </h2>
            <p className="text-sm text-[var(--muted)] mb-4">Transaction confirmed on Polygon.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium">
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">{mode === 'deposit' ? 'Deposit' : 'Withdraw'} USDC</h2>
            
            {mode === 'deposit' ? (
              <p className="text-sm text-[var(--muted)] mb-4">
                Deposit USDC (Polygon) to start trading. Wallet balance: <span className="font-mono text-white">${vault.walletUSDC}</span>
              </p>
            ) : (
              <div className="text-sm text-[var(--muted)] mb-4 space-y-1">
                <p>Available to withdraw: <span className="font-mono text-white">${vault.available}</span></p>
                <p>Locked in trades: <span className="font-mono text-white">${vault.locked}</span></p>
                <p>Total deposited: <span className="font-mono text-white">${vault.totalDeposited}</span></p>
              </div>
            )}

            <div className="mb-4">
              <label className="text-sm text-[var(--muted)] mb-1 block">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                  className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-3 font-mono text-lg focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => setAmount(maxAmount)}
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  MAX
                </button>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">USDC</span>
              </div>
            </div>

            {mode === 'deposit' && (
              <p className="text-xs text-[var(--muted)] mb-4">
                1% fee is charged on each trade — not on deposits.
              </p>
            )}

            {/* Error */}
            {txError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 font-mono break-all">
                  {txError.message?.includes('User rejected') ? 'Transaction rejected in wallet.' : 
                   txError.message?.includes('insufficient') ? 'Insufficient funds for transaction.' :
                   `Error: ${txError.message?.slice(0, 150) || 'Transaction failed'}`}
                </p>
                <button onClick={() => { setStep('input'); setTxErr(null); }} className="text-xs text-red-300 underline mt-1">Try again</button>
              </div>
            )}

            {/* Status */}
            {step !== 'input' && !txError && (
              <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                <p className="text-sm font-mono">
                  {step === 'approving' && (approving ? 'Confirm approval in wallet...' : 'Waiting for approval confirmation...')}
                  {step === 'executing' && (depositing || withdrawing ? 'Confirm transaction in wallet...' : 'Waiting for confirmation...')}
                </p>
              </div>
            )}

            {/* Validation feedback */}
            {amount && parseFloat(amount) > 0 && parseFloat(amount) > parseFloat(maxAmount) && (
              <p className="text-xs text-red-400 mb-3">
                {mode === 'deposit' 
                  ? `Insufficient wallet balance. You have $${vault.walletUSDC} USDC.`
                  : `Insufficient vault balance. You have $${vault.available} available.`}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(maxAmount) || isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
