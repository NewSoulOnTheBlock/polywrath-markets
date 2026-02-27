'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { ApiKeyManager } from '@/components/ApiKeyManager';
import { ApiKeySession } from '@/components/ApiKeySession';

export default function Settings() {
  const [riskLevel, setRiskLevel] = useState('moderate');
  const [maxPosition, setMaxPosition] = useState('100');
  const [autoTrade, setAutoTrade] = useState(true);
  const [markets, setMarkets] = useState({ btc: true, eth: true, sol: true });
  const [openaiKey, setOpenaiKey] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('polyagent_openai_key') || '';
    return '';
  });
  const [openaiSaved, setOpenaiSaved] = useState(false);
  const [polyKey, setPolyKey] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('polyagent_poly_api_key') || '';
    return '';
  });
  const [polySecret, setPolySecret] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('polyagent_poly_secret') || '';
    return '';
  });
  const [polyPassphrase, setPolyPassphrase] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('polyagent_poly_passphrase') || '';
    return '';
  });
  const [polySaved, setPolySaved] = useState(false);

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Risk Level */}
        <Card className="mb-4">
          <h3 className="font-semibold mb-4">Risk Level</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['conservative', 'moderate', 'aggressive'] as const).map(level => (
              <button
                key={level}
                onClick={() => setRiskLevel(level)}
                className={`py-3 rounded-lg text-sm font-medium transition-colors ${
                  riskLevel === level
                    ? level === 'conservative' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : level === 'moderate' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                    : 'bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30'
                    : 'bg-gray-900 border border-[var(--card-border)] text-[var(--muted)] hover:text-white'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)] mt-3">
            {riskLevel === 'conservative' && 'Trades only on strong signals (70%+). Lower frequency, lower risk.'}
            {riskLevel === 'moderate' && 'Trades on moderate signals (55%+). Balanced frequency and risk.'}
            {riskLevel === 'aggressive' && 'Trades on any signal above threshold (50%+). Higher frequency, higher risk.'}
          </p>
        </Card>

        {/* Max Position */}
        <Card className="mb-4">
          <h3 className="font-semibold mb-4">Max Position Size</h3>
          <div className="relative">
            <input
              type="number"
              value={maxPosition}
              onChange={e => setMaxPosition(e.target.value)}
              className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-3 font-mono focus:outline-none focus:border-[var(--accent)]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">USDC</span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-2">Maximum amount per individual trade.</p>
        </Card>

        {/* Markets */}
        <Card className="mb-4">
          <h3 className="font-semibold mb-4">Markets to Trade</h3>
          <div className="space-y-3">
            {[
              { key: 'btc', label: 'Bitcoin (BTC) Markets' },
              { key: 'eth', label: 'Ethereum (ETH) Markets' },
              { key: 'sol', label: 'Solana (SOL) Markets' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg cursor-pointer">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  checked={markets[key as keyof typeof markets]}
                  onChange={e => setMarkets({ ...markets, [key]: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
              </label>
            ))}
          </div>
        </Card>

        {/* Auto Trade */}
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Auto-Trade</h3>
              <p className="text-xs text-[var(--muted)] mt-1">Allow the agent to place trades automatically</p>
            </div>
            <button
              onClick={() => setAutoTrade(!autoTrade)}
              className={`relative w-12 h-6 rounded-full transition-colors ${autoTrade ? 'bg-[var(--accent)]' : 'bg-gray-700'}`}
            >
              <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${autoTrade ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </Card>

        {/* OpenAI API Key */}
        <Card className="mb-4">
          <h3 className="font-semibold mb-2">OpenAI API Key</h3>
          <p className="text-xs text-[var(--muted)] mb-3">
            The agent uses your OpenAI key for market analysis inference. Your key stays in your browser — never sent to our servers.
          </p>
          <div className="relative mb-3">
            <input
              type="password"
              value={openaiKey}
              onChange={e => { setOpenaiKey(e.target.value); setOpenaiSaved(false); }}
              placeholder="sk-..."
              className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            onClick={() => {
              localStorage.setItem('polyagent_openai_key', openaiKey);
              setOpenaiSaved(true);
              setTimeout(() => setOpenaiSaved(false), 2000);
            }}
            disabled={!openaiKey}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
          >
            {openaiSaved ? 'Saved' : 'Save Key'}
          </button>
          {openaiKey && (
            <button
              onClick={() => { setOpenaiKey(''); localStorage.removeItem('polyagent_openai_key'); }}
              className="ml-2 px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm text-[var(--muted)] hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </Card>

        {/* Polymarket API Credentials */}
        <Card className="mb-4">
          <h3 className="font-semibold mb-2">Polymarket API Credentials</h3>
          <p className="text-xs text-[var(--muted)] mb-3">
            Required for live trading. Generate at polymarket.com — you need all three values.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">API Key</label>
              <input
                type="password"
                value={polyKey}
                onChange={e => { setPolyKey(e.target.value); setPolySaved(false); }}
                placeholder="pa_..."
                className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">API Secret</label>
              <input
                type="password"
                value={polySecret}
                onChange={e => { setPolySecret(e.target.value); setPolySaved(false); }}
                placeholder="Secret key..."
                className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Passphrase</label>
              <input
                type="password"
                value={polyPassphrase}
                onChange={e => { setPolyPassphrase(e.target.value); setPolySaved(false); }}
                placeholder="Passphrase..."
                className="w-full bg-gray-900 border border-[var(--card-border)] rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={() => {
                localStorage.setItem('polyagent_poly_api_key', polyKey);
                localStorage.setItem('polyagent_poly_secret', polySecret);
                localStorage.setItem('polyagent_poly_passphrase', polyPassphrase);
                setPolySaved(true);
                setTimeout(() => setPolySaved(false), 2000);
              }}
              disabled={!polyKey}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
            >
              {polySaved ? 'Saved' : 'Save Credentials'}
            </button>
            {polyKey && (
              <button
                onClick={() => {
                  setPolyKey(''); setPolySecret(''); setPolyPassphrase('');
                  localStorage.removeItem('polyagent_poly_api_key');
                  localStorage.removeItem('polyagent_poly_secret');
                  localStorage.removeItem('polyagent_poly_passphrase');
                }}
                className="ml-2 px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm text-[var(--muted)] hover:text-white transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </Card>

        {/* API Keys */}
        <ApiKeyManager />

        {/* Trading Session */}
        <div className="mt-4">
          <ApiKeySession />
        </div>

        {/* Fee Info */}
        <Card className="mt-4">
          <h3 className="font-semibold mb-2">Fee Structure</h3>
          <p className="text-sm text-[var(--muted)]">
            1% of each trade&apos;s notional value is collected as a platform fee. No subscription, no deposit fees, no withdrawal fees.
          </p>
        </Card>
      </div>
    </>
  );
}
