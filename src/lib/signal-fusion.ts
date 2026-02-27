/**
 * Signal Fusion Engine — ported from aulekator/Polymarket-BTC-15-Minute-Trading-Bot
 * Combines multiple signal processors via weighted voting into a single actionable signal.
 */

import type { TradingSignal, SignalDirection } from './signal-processors';

const STRENGTH_VALUE: Record<string, number> = {
  WEAK: 1, MODERATE: 2, STRONG: 3, VERY_STRONG: 4,
};

const WEIGHTS: Record<string, number> = {
  SpikeDetection: 0.40,
  PriceDivergence: 0.30,
  SentimentAnalysis: 0.20,
  default: 0.10,
};

export interface FusedSignal {
  direction: SignalDirection;
  confidence: number;
  score: number;        // 0–100 consensus score
  isActionable: boolean; // score >= 60 && confidence >= 0.6
  isStrong: boolean;     // score >= 70
  signals: TradingSignal[];
  metadata: {
    bullishContrib: number;
    bearishContrib: number;
    totalContrib: number;
    numBullish: number;
    numBearish: number;
  };
}

export function fuseSignals(
  signals: TradingSignal[],
  opts: { minSignals?: number; minScore?: number } = {},
): FusedSignal | null {
  const minSignals = opts.minSignals ?? 1;
  const minScore = opts.minScore ?? 60;

  if (signals.length < minSignals) return null;

  // Only use signals from last 5 minutes
  const now = Date.now();
  const recent = signals.filter(s => now - s.timestamp < 5 * 60 * 1000);
  if (recent.length < minSignals) return null;

  let bullishContrib = 0;
  let bearishContrib = 0;

  for (const sig of recent) {
    const weight = WEIGHTS[sig.source] ?? WEIGHTS.default;
    const strengthFactor = (STRENGTH_VALUE[sig.strength] ?? 2) / 4;
    const conf = Math.min(1, Math.max(0, sig.confidence));
    const contribution = weight * conf * strengthFactor;

    if (sig.direction === 'BULLISH') bullishContrib += contribution;
    else if (sig.direction === 'BEARISH') bearishContrib += contribution;
  }

  const totalContrib = bullishContrib + bearishContrib;
  if (totalContrib < 0.0001) return null;

  const direction: SignalDirection = bullishContrib >= bearishContrib ? 'BULLISH' : 'BEARISH';
  const dominant = Math.max(bullishContrib, bearishContrib);
  const consensusScore = (dominant / totalContrib) * 100;

  const avgConf = recent.reduce((s, sig) => s + sig.confidence, 0) / recent.length;

  if (consensusScore < minScore) return null;

  return {
    direction,
    confidence: avgConf,
    score: consensusScore,
    isActionable: consensusScore >= 60 && avgConf >= 0.6,
    isStrong: consensusScore >= 70,
    signals: recent,
    metadata: {
      bullishContrib: Math.round(bullishContrib * 10000) / 10000,
      bearishContrib: Math.round(bearishContrib * 10000) / 10000,
      totalContrib: Math.round(totalContrib * 10000) / 10000,
      numBullish: recent.filter(s => s.direction === 'BULLISH').length,
      numBearish: recent.filter(s => s.direction === 'BEARISH').length,
    },
  };
}
