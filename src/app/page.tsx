'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] pulse-dot" />
              Live Trading
            </div>

            <img src="/polywrath-hero.png" alt="Poly-Wrath" className="w-48 sm:w-64 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]" />

            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4">
              <span className="text-red-500">Poly</span>-Wrath
            </h1>
            <p className="text-lg text-red-400/80 font-mono mb-2">
              Markets
            </p>
            <p className="text-xl text-[var(--muted)] mb-4">
              Autonomous AI agent trading Polymarket crypto markets.
            </p>
            <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
              Deposit USDC. The mech analyzes short-term crypto markets using real-time technical analysis, places trades, and manages your positions. 1% fee per trade. No emotions. Just iron fists.
            </p>

            <div className="flex items-center justify-center gap-4">
              {isConnected ? (
                <Link
                  href="/dashboard"
                  className="px-8 py-3.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 transition-colors shadow-lg shadow-red-900/30"
                >
                  Open Dashboard
                </Link>
              ) : (
                <ConnectButton label="Connect Wallet to Start" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            title="Real-Time TA"
            description="RSI, MACD, VWAP, Heiken Ashi, and delta scoring across all crypto short-term markets on Polymarket. The mech sees patterns you don't."
          />
          <FeatureCard
            title="Autonomous Trading"
            description="Deposit USDC and the agent places trades when signal strength exceeds your threshold. Fully managed. You sleep, the mech works."
          />
          <FeatureCard
            title="1% Per Trade"
            description="Simple, transparent fee structure. No subscriptions, no hidden costs. 1% per trade, you keep the rest."
          />
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Stat label="Markets Tracked" value="--" />
          <Stat label="Total Volume" value="--" />
          <Stat label="Active Agents" value="--" />
          <Stat label="Win Rate" value="--" />
        </div>

        {/* Footer */}
        <div className="mt-20 text-center border-t border-[var(--card-border)] pt-10">
          <p className="text-2xl font-bold mb-2">
            <span className="text-red-500">Poly</span>-Wrath Markets
          </p>
          <p className="text-sm text-[var(--muted)] max-w-lg mx-auto">
            AI-powered prediction market trading. Hydraulic fists meet algorithmic precision. 
            Built different. Trades harder.
          </p>
          <p className="text-xs text-[var(--muted)] mt-4 font-mono">
            Vault Contract: 0xb21285c26E2b1BcA2c85a41Ab524B5278beF779E (Polygon)
          </p>
          <p className="text-sm text-amber-400/70 mt-6 tracking-widest uppercase" style={{ fontFamily: 'serif' }}>
            Disciple of the Order of the ZeitGaist
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6 hover:border-red-500/30 transition-colors">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-3xl font-bold font-mono">{value}</p>
      <p className="text-sm text-[var(--muted)] mt-1">{label}</p>
    </div>
  );
}
