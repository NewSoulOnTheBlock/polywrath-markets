'use client';

import { useState, useEffect } from 'react';
import { Card } from './Card';

const SESSION_KEY = 'polyagent_api_key';

export function useApiKeySession() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null;
    if (stored) setApiKey(stored);
  }, []);

  const setKey = (key: string) => {
    sessionStorage.setItem(SESSION_KEY, key);
    setApiKey(key);
  };

  const clearKey = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setApiKey(null);
  };

  return { apiKey, setKey, clearKey, isAuthenticated: !!apiKey };
}

export function ApiKeySession() {
  const [input, setInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { apiKey, setKey, clearKey, isAuthenticated } = useApiKeySession();

  const handleSubmit = async () => {
    if (!input.trim()) return;
    if (!input.startsWith('pa_')) {
      setError('Invalid key format. Keys start with pa_');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      // Validate the key by hitting an authenticated endpoint
      const res = await fetch('/api/auth/keys', {
        headers: { Authorization: `Bearer ${input}` },
      });

      if (res.ok) {
        setKey(input);
        setInput('');
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid API key');
      }
    } catch {
      setError('Failed to validate key');
    } finally {
      setValidating(false);
    }
  };

  if (isAuthenticated) {
    return (
      <Card className="border-[var(--green)]/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] pulse-dot" />
              <h3 className="font-semibold text-[var(--green)]">Trading Session Active</h3>
            </div>
            <p className="text-sm text-[var(--muted)]">
              API key: <span className="font-mono">{apiKey?.slice(0, 12)}...{apiKey?.slice(-4)}</span>
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              The bot will use this key for all trades this session.
            </p>
          </div>
          <button
            onClick={clearKey}
            className="px-4 py-2 rounded-lg border border-[var(--red)]/30 text-[var(--red)] text-sm hover:bg-[var(--red)]/10 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="font-semibold mb-2">Enter API Key to Trade</h3>
      <p className="text-sm text-[var(--muted)] mb-4">
        Paste your API key below to activate the trading bot for this session. 
        Generate a key above if you don&apos;t have one.
      </p>

      <div className="space-y-3">
        <div className="relative">
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="pa_your_api_key_here..."
            disabled={validating}
            className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
          />
        </div>

        {error && <p className="text-sm text-[var(--red)]">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={validating || !input.trim()}
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
        >
          {validating ? 'Validating...' : 'Activate Trading Bot'}
        </button>

        <div className="pt-3 border-t border-[var(--card-border)]">
          <p className="text-xs text-[var(--muted)]">
            Your key is stored in session storage only — it clears when you close the tab. 
            The bot uses your key to place trades on your behalf via the vault contract. 
            1% fee per trade.
          </p>
        </div>
      </div>
    </Card>
  );
}
