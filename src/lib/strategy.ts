/**
 * Poly-Wrath Strategy Engine
 * 
 * Uses the 3-processor + fusion architecture from aulekator's bot:
 *   1. SpikeDetection (MA deviation + velocity) — weight 0.40
 *   2. PriceDivergence (extreme prob fade + momentum mispricing) — weight 0.30
 *   3. SentimentAnalysis (Fear & Greed contrarian) — weight 0.20
 * 
 * Fused via weighted voting → single actionable signal → feeds our execution engine.
 */

import { ingest, type IngestedSnapshot } from './ingestion';
import {
  processSpikeDetection,
  processSentiment,
  processDivergence,
  type TradingSignal,
} from './signal-processors';
import { fuseSignals, type FusedSignal } from './signal-fusion';

export type Direction = 'UP' | 'DOWN';

export interface EvaluationResult {
  decision: 'trade' | 'skip' | 'hold';
  reason?: string;
  side?: Direction;
  fusedSignal: FusedSignal | null;
  rawSignals: TradingSignal[];
  snapshot: IngestedSnapshot;
}

// Rolling Polymarket price history (UP probability over time)
const polyPriceHistory: number[] = [];
const MAX_POLY_HISTORY = 100;

/**
 * Feed a new Polymarket UP probability into the rolling history.
 * Call this whenever you fetch fresh market data.
 */
export function feedPolyPrice(upProb: number) {
  polyPriceHistory.push(upProb);
  if (polyPriceHistory.length > MAX_POLY_HISTORY) polyPriceHistory.shift();
}

/**
 * Main evaluation function.
 * 
 * 1. Ingests external data (Coinbase, Binance, Fear & Greed)
 * 2. Runs all 3 signal processors
 * 3. Fuses signals via weighted voting
 * 4. Returns a structured decision
 * 
 * @param polyUpProb Current Polymarket UP probability (0–1) for the active market
 */
export async function evaluateMarket(polyUpProb: number): Promise<EvaluationResult> {
  // Feed the latest poly price
  feedPolyPrice(polyUpProb);

  // Phase 2: Ingest external data
  const snapshot = await ingest();

  // If ingestion invalid, skip
  if (!snapshot.meta.isValid) {
    return {
      decision: 'skip',
      reason: `Ingestion invalid: ${snapshot.meta.reasons.join('; ')}`,
      fusedSignal: null,
      rawSignals: [],
      snapshot,
    };
  }

  // Phase 3: Run signal processors
  const rawSignals: TradingSignal[] = [];

  // 1. Spike Detection — uses Polymarket UP probability history
  const spike = processSpikeDetection(polyUpProb, polyPriceHistory);
  if (spike) rawSignals.push(spike);

  // 2. Sentiment — uses Fear & Greed index
  const sentiment = processSentiment(snapshot.sentiment.fearGreed, polyUpProb);
  if (sentiment) rawSignals.push(sentiment);

  // 3. Price Divergence — uses poly prob + Coinbase spot price
  const divergence = processDivergence(polyUpProb, snapshot.price);
  if (divergence) rawSignals.push(divergence);

  // No signals at all
  if (rawSignals.length === 0) {
    return {
      decision: 'hold',
      reason: 'No signals generated',
      fusedSignal: null,
      rawSignals,
      snapshot,
    };
  }

  // Phase 4: Fuse signals
  const fused = fuseSignals(rawSignals, { minSignals: 1, minScore: 60 });

  if (!fused) {
    return {
      decision: 'hold',
      reason: 'Fusion did not produce actionable signal',
      fusedSignal: null,
      rawSignals,
      snapshot,
    };
  }

  if (!fused.isActionable) {
    return {
      decision: 'hold',
      reason: `Signal not strong enough (score=${fused.score.toFixed(1)}, conf=${(fused.confidence * 100).toFixed(0)}%)`,
      fusedSignal: fused,
      rawSignals,
      snapshot,
    };
  }

  // Flow confirmation: require Binance buy/sell imbalance to agree
  const side: Direction = fused.direction === 'BULLISH' ? 'UP' : 'DOWN';
  const flowAgrees = snapshot.shortTermFlow.buySellImbalance * (side === 'UP' ? 1 : -1) > 0;

  if (!flowAgrees && Math.abs(snapshot.shortTermFlow.buySellImbalance) > 0.1) {
    return {
      decision: 'skip',
      reason: `Flow disagreement (imbalance=${(snapshot.shortTermFlow.buySellImbalance * 100).toFixed(1)}% vs ${side})`,
      fusedSignal: fused,
      rawSignals,
      snapshot,
    };
  }

  // Decision: TRADE
  return {
    decision: 'trade',
    side,
    fusedSignal: fused,
    rawSignals,
    snapshot,
  };
}
