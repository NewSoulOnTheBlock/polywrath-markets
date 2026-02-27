import { NextResponse } from 'next/server';

// Simple Coinbase market snapshot for BTC-USD
// Docs: https://docs.cloud.coinbase.com/exchange/reference/exchangerestapi_getproductticker

const CB_BASE = 'https://api.exchange.coinbase.com';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 5 } });
  if (!res.ok) throw new Error(`Coinbase error ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    // Ticker
    const ticker = await fetchJson<{
      price: string;
      bid: string;
      ask: string;
      volume: string;
      time: string;
    }>(`${CB_BASE}/products/BTC-USD/ticker`);

    // Order book (level 2)
    const book = await fetchJson<{
      bids: [string, string, string][];
      asks: [string, string, string][];
    }>(`${CB_BASE}/products/BTC-USD/book?level=2`);

    // 24h stats
    const stats = await fetchJson<{
      volume: string;
      high: string;
      low: string;
      open: string;
      last: string;
      volume_30day: string;
    }>(`${CB_BASE}/products/BTC-USD/stats`);

    const parseBookSide = (side: [string, string, string][]) =>
      side.slice(0, 20).map(([price, size]) => ({
        price: parseFloat(price),
        size: parseFloat(size),
      }));

    const snapshot = {
      symbol: 'BTC-USD',
      price: parseFloat(ticker.price),
      bid: parseFloat(ticker.bid),
      ask: parseFloat(ticker.ask),
      volume24h: parseFloat(stats.volume),
      high24h: parseFloat(stats.high),
      low24h: parseFloat(stats.low),
      orderBook: {
        bids: parseBookSide(book.bids),
        asks: parseBookSide(book.asks),
      },
      ts: Date.now(),
    };

    return NextResponse.json(snapshot, { status: 200 });
  } catch (err) {
    console.error('Coinbase snapshot failed:', err);
    return NextResponse.json({ error: 'Failed to fetch Coinbase data' }, { status: 500 });
  }
}
