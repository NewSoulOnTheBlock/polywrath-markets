// Technical Analysis Engine — ported from PolymarketBTC15mAssistant

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface HeikenAshi {
  open: number;
  high: number;
  low: number;
  close: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface TASnapshot {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  vwap: number;
  heikenAshi: HeikenAshi;
  delta1m: number;
  delta3m: number;
  prediction: { long: number; short: number };
  signal: 'LONG' | 'SHORT' | 'NEUTRAL';
  strength: number; // 0-100
}

// RSI calculation
export function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// EMA calculation
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

// MACD
export function calcMACD(closes: number[]): { value: number; signal: number; histogram: number } {
  if (closes.length < 26) return { value: 0, signal: 0, histogram: 0 };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine.slice(-9), 9);
  const value = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { value, signal, histogram: value - signal };
}

// VWAP
export function calcVWAP(candles: Candle[]): number {
  let cumVol = 0, cumTP = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumTP += tp * c.volume;
    cumVol += c.volume;
  }
  return cumVol > 0 ? cumTP / cumVol : 0;
}

// Heiken Ashi
export function calcHeikenAshi(candles: Candle[]): HeikenAshi {
  if (candles.length < 2) {
    const c = candles[0];
    return { open: c.open, high: c.high, low: c.low, close: c.close, trend: 'neutral' };
  }
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];
  const haClose = (curr.open + curr.high + curr.low + curr.close) / 4;
  const haOpen = (prev.open + prev.close) / 2;
  const haHigh = Math.max(curr.high, haOpen, haClose);
  const haLow = Math.min(curr.low, haOpen, haClose);
  const trend = haClose > haOpen ? 'bullish' : haClose < haOpen ? 'bearish' : 'neutral';
  return { open: haOpen, high: haHigh, low: haLow, close: haClose, trend };
}

// Delta (price change over N candles)
function calcDelta(closes: number[], n: number): number {
  if (closes.length < n + 1) return 0;
  const recent = closes[closes.length - 1];
  const past = closes[closes.length - 1 - n];
  return past > 0 ? ((recent - past) / past) * 100 : 0;
}

// Score TA into prediction
function score(rsi: number, macd: { histogram: number }, ha: HeikenAshi, delta1m: number, delta3m: number): { long: number; short: number; signal: 'LONG' | 'SHORT' | 'NEUTRAL'; strength: number } {
  let bullPoints = 0, bearPoints = 0;

  // RSI
  if (rsi < 30) bullPoints += 3;
  else if (rsi < 40) bullPoints += 1;
  else if (rsi > 70) bearPoints += 3;
  else if (rsi > 60) bearPoints += 1;

  // MACD histogram
  if (macd.histogram > 0) bullPoints += 2;
  else if (macd.histogram < 0) bearPoints += 2;

  // Heiken Ashi trend
  if (ha.trend === 'bullish') bullPoints += 2;
  else if (ha.trend === 'bearish') bearPoints += 2;

  // Deltas
  if (delta1m > 0.05) bullPoints += 1;
  else if (delta1m < -0.05) bearPoints += 1;
  if (delta3m > 0.1) bullPoints += 1;
  else if (delta3m < -0.1) bearPoints += 1;

  const total = bullPoints + bearPoints || 1;
  const longPct = Math.round((bullPoints / total) * 100);
  const shortPct = 100 - longPct;
  const strength = Math.abs(longPct - shortPct);
  const signal = longPct > 60 ? 'LONG' : shortPct > 60 ? 'SHORT' : 'NEUTRAL';

  return { long: longPct, short: shortPct, signal, strength };
}

// Full TA snapshot
export function computeTA(candles: Candle[]): TASnapshot {
  const closes = candles.map(c => c.close);
  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const vwap = calcVWAP(candles);
  const heikenAshi = calcHeikenAshi(candles);
  const delta1m = calcDelta(closes, 1);
  const delta3m = calcDelta(closes, 3);
  const { long, short, signal, strength } = score(rsi, macd, heikenAshi, delta1m, delta3m);

  return { rsi, macd, vwap, heikenAshi, delta1m, delta3m, prediction: { long, short }, signal, strength };
}
