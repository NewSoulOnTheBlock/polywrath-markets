import { fetchMarketContext, type MarketContext } from './market-context';

export interface IngestedSnapshot {
  price: number;            // canonical BTC price
  spread: number;           // ask - bid
  volume24h: number;
  shortTermFlow: {
    buySellImbalance: number; // (buys - sells) / (buys + sells)
    vwapDelta: number | null; // (spot - vwap) / spot
  };
  sentiment: {
    fearGreed: number;        // 0–100
  };
  meta: {
    ts: number;
    sourceLagMs: number;
    isValid: boolean;
    reasons: string[];
  };
}

function safeDiffPct(a: number, b: number): number {
  if (!isFinite(a) || !isFinite(b) || a === 0) return 0;
  return Math.abs(a - b) / Math.abs(a);
}

export async function ingest(): Promise<IngestedSnapshot> {
  const ctx: MarketContext = await fetchMarketContext();
  const reasons: string[] = [];
  const now = Date.now();

  const coinbase = ctx.coinbase;
  const binance = ctx.binance;
  const fng = ctx.fearGreed;

  const spot = coinbase?.price ?? binance?.lastPrice ?? NaN;
  const bid = coinbase?.bid ?? NaN;
  const ask = coinbase?.ask ?? NaN;
  const spread = isFinite(bid) && isFinite(ask) ? ask - bid : NaN;

  // Flow aggregates
  let buySellImbalance = 0;
  let vwapDelta: number | null = null;
  if (binance) {
    const buys = binance.buyVolumeWindow;
    const sells = binance.sellVolumeWindow;
    const total = buys + sells;
    if (total > 0) {
      buySellImbalance = (buys - sells) / total;
    }
    if (binance.vwapWindow && isFinite(spot)) {
      vwapDelta = (spot - binance.vwapWindow) / spot;
    }
  }

  const fearGreed = fng?.value ?? 50;

  // Validation rules
  if (!isFinite(spot)) reasons.push('No canonical spot price');

  if (coinbase && binance && safeDiffPct(coinbase.price, binance.lastPrice) > 0.02) {
    reasons.push('Coinbase vs Binance price mismatch > 2%');
  }

  if (binance && binance.tradesWindow === 0) {
    reasons.push('No recent trades in Binance window');
  }

  const sourceLagMs = Math.max(
    now - (coinbase?.ts ?? now),
    now - (binance?.ts ?? now),
    now - (fng?.ts ?? now),
  );

  const isValid = reasons.length === 0;

  return {
    price: spot,
    spread,
    volume24h: coinbase?.volume24h ?? binance?.volume24h ?? 0,
    shortTermFlow: { buySellImbalance, vwapDelta },
    sentiment: { fearGreed },
    meta: { ts: now, sourceLagMs, isValid, reasons },
  };
}
