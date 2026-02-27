/**
 * Signal processors ported from aulekator/Polymarket-BTC-15-Minute-Trading-Bot
 * Three processors: SpikeDetection, Sentiment, PriceDivergence
 * Fused via weighted voting in signal-fusion.ts
 */

// --- Types ---

export type SignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type SignalStrength = 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';

const STRENGTH_VALUE: Record<SignalStrength, number> = {
  WEAK: 1, MODERATE: 2, STRONG: 3, VERY_STRONG: 4,
};

export interface TradingSignal {
  timestamp: number;
  source: string;
  direction: SignalDirection;
  strength: SignalStrength;
  confidence: number; // 0–1
  score: number;      // 0–100
  metadata: Record<string, unknown>;
}

function makeSignal(
  source: string,
  direction: SignalDirection,
  strength: SignalStrength,
  confidence: number,
  metadata: Record<string, unknown> = {},
): TradingSignal {
  const strengthW = STRENGTH_VALUE[strength] / 4;
  const score = (strengthW * 0.5 + confidence * 0.5) * 100;
  return { timestamp: Date.now(), source, direction, strength, confidence, score, metadata };
}

// --- 1. Spike Detection ---
// Detects MA deviation spikes (mean reversion) and velocity spikes (momentum)

export function processSpikeDetection(
  currentPrice: number,
  priceHistory: number[],
  opts: {
    spikeThreshold?: number;   // default 0.05
    lookback?: number;         // default 20
    minConfidence?: number;    // default 0.55
    velocityThreshold?: number; // default 0.03
  } = {},
): TradingSignal | null {
  const threshold = opts.spikeThreshold ?? 0.05;
  const lookback = opts.lookback ?? 20;
  const minConf = opts.minConfidence ?? 0.55;
  const velThresh = opts.velocityThreshold ?? 0.03;

  if (priceHistory.length < lookback) return null;

  const recent = priceHistory.slice(-lookback);
  const ma = recent.reduce((s, p) => s + p, 0) / recent.length;
  const deviation = ma > 0 ? (currentPrice - ma) / ma : 0;
  const deviationAbs = Math.abs(deviation);

  // Velocity: last 3 ticks
  let velocity = 0;
  if (priceHistory.length >= 3) {
    const prev3 = priceHistory[priceHistory.length - 3];
    velocity = prev3 > 0 ? (currentPrice - prev3) / prev3 : 0;
  }

  // Signal 1: MA deviation spike → mean reversion
  if (deviationAbs >= threshold) {
    const direction: SignalDirection = deviation > 0 ? 'BEARISH' : 'BULLISH';
    let strength: SignalStrength;
    if (deviationAbs >= 0.12) strength = 'VERY_STRONG';
    else if (deviationAbs >= 0.08) strength = 'STRONG';
    else if (deviationAbs >= 0.05) strength = 'MODERATE';
    else strength = 'WEAK';

    const confidence = Math.min(0.90, 0.50 + (deviationAbs - threshold) * 3.0);
    if (confidence < minConf) return null;

    return makeSignal('SpikeDetection', direction, strength, confidence, {
      mode: 'ma_deviation', deviation, ma, velocity,
    });
  }

  // Signal 2: Velocity spike → momentum continuation
  if (Math.abs(velocity) >= velThresh && deviationAbs < threshold * 0.6) {
    const direction: SignalDirection = velocity > 0 ? 'BULLISH' : 'BEARISH';
    const velStrength = Math.abs(velocity) / velThresh;
    let strength: SignalStrength;
    let confidence: number;
    if (velStrength >= 3) { strength = 'MODERATE'; confidence = 0.65; }
    else if (velStrength >= 2) { strength = 'WEAK'; confidence = 0.60; }
    else { strength = 'WEAK'; confidence = 0.57; }

    if (confidence < minConf) return null;

    return makeSignal('SpikeDetection', direction, strength, confidence, {
      mode: 'velocity', velocity, ma, deviation,
    });
  }

  return null;
}

// --- 2. Sentiment Processor ---
// Contrarian: extreme fear → bullish, extreme greed → bearish

export function processSentiment(
  fearGreedValue: number,
  currentPrice: number,
  opts: {
    extremeFear?: number;   // default 25
    extremeGreed?: number;  // default 75
    minConfidence?: number; // default 0.50
  } = {},
): TradingSignal | null {
  const eFear = opts.extremeFear ?? 25;
  const eGreed = opts.extremeGreed ?? 75;
  const minConf = opts.minConfidence ?? 0.50;

  let direction: SignalDirection;
  let strength: SignalStrength;
  let confidence: number;

  if (fearGreedValue <= eFear) {
    direction = 'BULLISH';
    const extremeness = (eFear - fearGreedValue) / eFear;
    if (extremeness >= 0.8) { strength = 'VERY_STRONG'; confidence = 0.85; }
    else if (extremeness >= 0.5) { strength = 'STRONG'; confidence = 0.75; }
    else { strength = 'MODERATE'; confidence = 0.65; }
  } else if (fearGreedValue >= eGreed) {
    direction = 'BEARISH';
    const extremeness = (fearGreedValue - eGreed) / (100 - eGreed);
    if (extremeness >= 0.8) { strength = 'VERY_STRONG'; confidence = 0.85; }
    else if (extremeness >= 0.5) { strength = 'STRONG'; confidence = 0.75; }
    else { strength = 'MODERATE'; confidence = 0.65; }
  } else if (fearGreedValue < 45) {
    direction = 'BULLISH'; strength = 'WEAK'; confidence = 0.55;
  } else if (fearGreedValue > 55) {
    direction = 'BEARISH'; strength = 'WEAK'; confidence = 0.55;
  } else {
    return null; // neutral
  }

  if (confidence < minConf) return null;

  return makeSignal('SentimentAnalysis', direction, strength, confidence, {
    fearGreedValue,
  });
}

// --- 3. Price Divergence Processor ---
// Detects mispricing between Polymarket UP probability and BTC spot momentum

const spotHistory: number[] = [];
const MAX_SPOT_HISTORY = 10;

export function processDivergence(
  polyProb: number,      // Polymarket UP probability (0–1)
  spotPrice: number | null,
  opts: {
    momentumThreshold?: number;   // default 0.003
    extremeProbThreshold?: number; // default 0.68
    lowProbThreshold?: number;     // default 0.32
    minConfidence?: number;        // default 0.55
  } = {},
): TradingSignal | null {
  const momThresh = opts.momentumThreshold ?? 0.003;
  const highProb = opts.extremeProbThreshold ?? 0.68;
  const lowProb = opts.lowProbThreshold ?? 0.32;
  const minConf = opts.minConfidence ?? 0.55;

  if (spotPrice !== null) {
    spotHistory.push(spotPrice);
    if (spotHistory.length > MAX_SPOT_HISTORY) spotHistory.shift();
  }

  // Compute spot momentum
  let spotMomentum = 0;
  if (spotPrice !== null && spotHistory.length >= 3) {
    const oldest = spotHistory[spotHistory.length - Math.min(3, spotHistory.length)];
    spotMomentum = (spotPrice - oldest) / oldest;
  }

  // Signal 1: Extreme probability fade
  if (polyProb >= highProb && spotMomentum <= 0.001) {
    const extremeness = (polyProb - highProb) / (1.0 - highProb);
    const confidence = Math.min(0.80, minConf + extremeness * 0.25);
    const strength: SignalStrength = extremeness > 0.5 ? 'STRONG' : 'MODERATE';
    return makeSignal('PriceDivergence', 'BEARISH', strength, confidence, {
      type: 'extreme_prob_fade_down', polyProb, spotMomentum, extremeness,
    });
  }

  if (polyProb <= lowProb && spotMomentum >= -0.001) {
    const extremeness = (lowProb - polyProb) / lowProb;
    const confidence = Math.min(0.80, minConf + extremeness * 0.25);
    const strength: SignalStrength = extremeness > 0.5 ? 'STRONG' : 'MODERATE';
    return makeSignal('PriceDivergence', 'BULLISH', strength, confidence, {
      type: 'extreme_prob_fade_up', polyProb, spotMomentum, extremeness,
    });
  }

  // Signal 2: Momentum mispricing
  if (polyProb >= 0.35 && polyProb <= 0.65 && Math.abs(spotMomentum) >= momThresh) {
    const momStrength = Math.abs(spotMomentum) / momThresh;
    const confidence = Math.min(0.78, 0.55 + Math.min(momStrength - 1, 2) * 0.08);
    let strength: SignalStrength;
    if (momStrength >= 3) strength = 'STRONG';
    else if (momStrength >= 2) strength = 'MODERATE';
    else strength = 'WEAK';

    if (confidence < minConf) return null;

    const direction: SignalDirection = spotMomentum > 0 ? 'BULLISH' : 'BEARISH';
    return makeSignal('PriceDivergence', direction, strength, confidence, {
      type: 'momentum_mispricing', polyProb, spotMomentum, momStrength,
    });
  }

  return null;
}
