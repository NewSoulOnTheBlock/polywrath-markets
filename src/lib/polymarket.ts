// Polymarket API client

const GAMMA_API = 'https://gamma-api.polymarket.com';

export interface Market {
  id: string;
  slug: string;
  question: string;
  category: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
  image?: string;
}

export async function fetchCryptoMarkets(): Promise<Market[]> {
  try {
    // Fetch newest markets — 15-min BTC/ETH/SOL up/down markets cycle constantly
    const res = await fetch(
      `${GAMMA_API}/markets?closed=false&active=true&limit=200&order=startDate&ascending=false`,
      { next: { revalidate: 15 } }
    );
    const data = await res.json();
    
    // Only 15-min BTC, ETH, SOL up/down markets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combined = data.filter((m: any) => {
      const s = (m.slug || '').toLowerCase();
      const q = (m.question || '').toLowerCase();
      const is15m = q.includes('15 min') || q.includes('15m') || s.includes('15m');
      const isBtc = q.includes('bitcoin') || s.includes('btc');
      const isEth = q.includes('ethereum') || s.includes('eth');
      const isSol = q.includes('solana') || s.includes('sol');
      const isUpDown = q.includes('up or down') || s.includes('updown');
      return is15m && isUpDown && (isBtc || isEth || isSol);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return combined.map((m: any) => ({
      id: m.id || m.conditionId,
      slug: m.slug || '',
      question: m.question || '',
      category: m.category || 'Crypto',
      endDate: m.endDate || m.end_date_iso || '',
      active: m.active ?? true,
      closed: m.closed ?? false,
      outcomes: m.outcomes ? JSON.parse(m.outcomes) : ['Yes', 'No'],
      outcomePrices: m.outcomePrices ? JSON.parse(m.outcomePrices) : ['0.5', '0.5'],
      volume: m.volume || '0',
      liquidity: m.liquidity || '0',
      bestBid: parseFloat(m.bestBid || '0'),
      bestAsk: parseFloat(m.bestAsk || '0'),
      lastTradePrice: parseFloat(m.lastTradePrice || '0'),
      image: m.image,
    })) as Market[];
  } catch (err) {
    console.error('Failed to fetch markets:', err);
    return [];
  }
}

export async function fetchMarketBySlug(slug: string): Promise<Market | null> {
  try {
    const res = await fetch(`${GAMMA_API}/markets?slug=${slug}`);
    const data = await res.json();
    if (!data.length) return null;
    const m = data[0];
    return {
      id: m.id || m.conditionId,
      slug: m.slug || '',
      question: m.question || '',
      category: m.category || 'Crypto',
      endDate: m.endDate || '',
      active: m.active ?? true,
      closed: m.closed ?? false,
      outcomes: m.outcomes ? JSON.parse(m.outcomes) : ['Yes', 'No'],
      outcomePrices: m.outcomePrices ? JSON.parse(m.outcomePrices) : ['0.5', '0.5'],
      volume: m.volume || '0',
      liquidity: m.liquidity || '0',
      bestBid: parseFloat(m.bestBid || '0'),
      bestAsk: parseFloat(m.bestAsk || '0'),
      lastTradePrice: parseFloat(m.lastTradePrice || '0'),
      image: m.image,
    };
  } catch {
    return null;
  }
}

export function formatUSD(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${(num * 100).toFixed(1)}%`;
}
