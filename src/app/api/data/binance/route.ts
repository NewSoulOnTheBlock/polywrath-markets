import { NextResponse } from 'next/server';

// Approximation of Binance flow via REST (ticker + recent trades)
// This avoids long-lived WebSocket state on serverless, but gives similar short-term signal.

const BINANCE_BASE = 'https://api.binance.com';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance error ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const [ticker, trades] = await Promise.all([
      fetchJson<{
        lastPrice: string;
        volume: string;
      }>(`${BINANCE_BASE}/api/v3/ticker/24hr?symbol=BTCUSDT`),
      fetchJson<{
        price: string;
        qty: string;
        isBuyerMaker: boolean;
        time: number;
      }[]>(`${BINANCE_BASE}/api/v3/trades?symbol=BTCUSDT&limit=100`),
    ]);

    const now = Date.now();
    const windowMs = 60_000; // 60s window
    const recent = trades.filter(t => now - t.time <= windowMs);

    let buyVolume = 0;
    let sellVolume = 0;
    let vwapNumerator = 0;
    let vwapDenominator = 0;

    for (const t of recent) {
      const price = parseFloat(t.price);
      const size = parseFloat(t.qty);
      vwapNumerator += price * size;
      vwapDenominator += size;
      if (t.isBuyerMaker) {
        // trade was a sell into bid
        sellVolume += size;
      } else {
        buyVolume += size;
      }
    }

    const snapshot = {
      symbol: 'BTCUSDT',
      lastPrice: parseFloat(ticker.lastPrice),
      volume24h: parseFloat(ticker.volume),
      windowSeconds: windowMs / 1000,
      tradesWindow: recent.length,
      buyVolumeWindow: buyVolume,
      sellVolumeWindow: sellVolume,
      vwapWindow: vwapDenominator > 0 ? vwapNumerator / vwapDenominator : null,
      ts: now,
    };

    return NextResponse.json(snapshot, { status: 200 });
  } catch (err) {
    console.error('Binance flow snapshot failed:', err);
    return NextResponse.json({ error: 'Failed to fetch Binance data' }, { status: 500 });
  }
}
