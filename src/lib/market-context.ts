// Shared market context used by the Poly-Wrath agent

export interface CoinbaseSnapshot {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  orderBook: {
    bids: { price: number; size: number }[];
    asks: { price: number; size: number }[];
  };
  ts: number;
}

export interface BinanceFlowSnapshot {
  symbol: string;
  lastPrice: number;
  volume24h: number;
  windowSeconds: number;
  tradesWindow: number;
  buyVolumeWindow: number;
  sellVolumeWindow: number;
  vwapWindow: number | null;
  ts: number;
}

export interface FearGreedSnapshot {
  value: number; // 0-100
  classification: string;
  timestamp: number;
  ts: number;
}

export interface SolanaSnapshot {
  slot: number;
  ts: number;
}

export interface MarketContext {
  coinbase?: CoinbaseSnapshot;
  binance?: BinanceFlowSnapshot;
  fearGreed?: FearGreedSnapshot;
  solana?: SolanaSnapshot;
}

export async function fetchMarketContext(): Promise<MarketContext> {
  const [cbRes, binRes, fngRes, solRes] = await Promise.allSettled([
    fetch('/api/data/coinbase'),
    fetch('/api/data/binance'),
    fetch('/api/data/fear-greed'),
    fetch('/api/data/solana'),
  ]);

  const ctx: MarketContext = {};

  if (cbRes.status === 'fulfilled' && cbRes.value.ok) {
    ctx.coinbase = (await cbRes.value.json()) as CoinbaseSnapshot;
  }
  if (binRes.status === 'fulfilled' && binRes.value.ok) {
    ctx.binance = (await binRes.value.json()) as BinanceFlowSnapshot;
  }
  if (fngRes.status === 'fulfilled' && fngRes.value.ok) {
    ctx.fearGreed = (await fngRes.value.json()) as FearGreedSnapshot;
  }
  if (solRes.status === 'fulfilled' && solRes.value.ok) {
    ctx.solana = (await solRes.value.json()) as SolanaSnapshot;
  }

  return ctx;
}
