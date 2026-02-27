'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Card } from './Card';

export function ApiKeyManager() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [label, setLabel] = useState('default');

  const generateKey = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    setApiKey(null);

    try {
      // Step 1: Get nonce
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const { nonce, message } = await nonceRes.json();

      if (!nonce) throw new Error('Failed to get nonce');

      // Step 2: Sign message
      const signature = await signMessageAsync({ message });

      // Step 3: Verify and get API key
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce, label }),
      });
      const data = await verifyRes.json();

      if (data.apiKey) {
        setApiKey(data.apiKey);
      } else {
        throw new Error(data.error || 'Failed to generate key');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate API key';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <h3 className="font-semibold mb-4">API Keys</h3>
      <p className="text-sm text-[var(--muted)] mb-4">
        Generate an API key to access PolyAgent programmatically. Sign a message with your wallet — no gas required.
      </p>

      {apiKey ? (
        <div className="space-y-3">
          <div className="p-3 bg-gray-900 rounded-lg border border-[var(--green)]/30">
            <p className="text-xs text-[var(--green)] mb-1">API Key Generated — save it now, it won&apos;t be shown again</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-white flex-1 break-all">{apiKey}</code>
              <button
                onClick={copyKey}
                className="px-3 py-1.5 rounded bg-[var(--accent)] text-white text-xs font-medium shrink-0"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="p-3 bg-gray-900/50 rounded-lg">
            <p className="text-xs text-[var(--muted)] mb-2">Usage:</p>
            <code className="text-xs font-mono text-gray-300 block">
              curl -H &quot;Authorization: Bearer {apiKey.slice(0, 12)}...&quot; \<br />
              &nbsp;&nbsp;https://polymarket-agent-dapp.vercel.app/api/portfolio?address={address}
            </code>
          </div>
          <button
            onClick={() => setApiKey(null)}
            className="text-sm text-[var(--muted)] hover:text-white transition-colors"
          >
            Generate another key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-[var(--muted)] mb-1 block">Key Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. trading-bot, webhook"
              className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--red)]">{error}</p>
          )}
          <button
            onClick={generateKey}
            disabled={loading || !address}
            className="w-full px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
          >
            {loading ? 'Sign message in wallet...' : 'Generate API Key'}
          </button>
        </div>
      )}

      {/* Endpoints Reference */}
      <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
        <p className="text-xs text-[var(--muted)] mb-2">Available Endpoints:</p>
        <div className="space-y-1 font-mono text-xs">
          <p><span className="text-[var(--green)]">GET</span> /api/markets — List crypto markets</p>
          <p><span className="text-[var(--green)]">GET</span> /api/market/[slug] — Market detail</p>
          <p><span className="text-[var(--green)]">GET</span> /api/portfolio?address=0x... — Vault balances</p>
          <p><span className="text-[var(--green)]">GET</span> /api/history?address=0x... — Trade history</p>
          <p><span className="text-[var(--green)]">GET</span> /api/orderbook/[tokenId] — Order book</p>
          <p><span className="text-[var(--yellow)]">POST</span> /api/trade — Place trade</p>
          <p><span className="text-[var(--yellow)]">POST</span> /api/auth/nonce — Get auth nonce</p>
          <p><span className="text-[var(--yellow)]">POST</span> /api/auth/verify — Verify + get key</p>
        </div>
      </div>
    </Card>
  );
}
