// Thin evaluation scaffold that will eventually decide whether to trade.
// For now it just calls ingestion and returns a decision + debug info.

import { ingest, type IngestedSnapshot } from './ingestion';

export type Direction = 'UP' | 'DOWN';

export interface Signal {
  direction: Direction;
  strength: number; // 0..1
}

export interface EvaluationResult {
  decision: 'trade' | 'skip' | 'hold';
  reason?: string;
  side?: Direction;
  size?: number;
  snapshot: IngestedSnapshot;
  signal: Signal;
}

// TODO: wire to real TA engine
function dummySignal(): Signal {
  return { direction: 'UP', strength: 0.0 };
}

export async function evaluateAndMaybeTrade(): Promise<EvaluationResult> {
  const snapshot = await ingest();

  if (!snapshot.meta.isValid) {
    return {
      decision: 'skip',
      reason: snapshot.meta.reasons.join('; '),
      snapshot,
      signal: dummySignal(),
    };
  }

  // Fear & Greed hard gate (extremes require very strong signals)
  const extremeSentiment = snapshot.sentiment.fearGreed <= 10 || snapshot.sentiment.fearGreed >= 90;

  const signal = dummySignal();

  // Flow confirmation: require buy/sell imbalance to agree with direction
  const agreesWithFlow = snapshot.shortTermFlow.buySellImbalance * (signal.direction === 'UP' ? 1 : -1) > 0;

  if (!agreesWithFlow) {
    return {
      decision: 'skip',
      reason: 'flow disagreement',
      snapshot,
      signal,
    };
  }

  const threshold = extremeSentiment ? 0.85 : 0.7;

  if (signal.strength >= threshold) {
    return {
      decision: 'trade',
      side: signal.direction,
      // TODO: derive size from risk settings
      size: 0,
      snapshot,
      signal,
    };
  }

  return {
    decision: 'hold',
    reason: 'signal below threshold',
    snapshot,
    signal,
  };
}
