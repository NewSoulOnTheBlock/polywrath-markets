/**
 * Polymarket CLOB (Central Limit Order Book) Client
 * 
 * Polymarket uses a hybrid on-chain/off-chain order book:
 * - Orders are signed off-chain (EIP-712) and submitted to the CLOB API
 * - Settlement happens on-chain via the CTF Exchange contract on Polygon
 * - Outcome tokens are Conditional Tokens (ERC-1155) from Gnosis CTF
 * 
 * Docs: https://docs.polymarket.com
 * CLOB API: https://clob.polymarket.com
 * CTF Exchange (Polygon): 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E (NegRiskCTFExchange)
 */

const CLOB_BASE = 'https://clob.polymarket.com';

// Polymarket contract addresses on Polygon
export const CONTRACTS = {
  CTF_EXCHANGE: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',      // NegRiskCTFExchange
  NEG_RISK_ADAPTER: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',   // NegRiskAdapter
  CONDITIONAL_TOKENS: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045', // CTF Framework
  USDC_POLYGON: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',      // USDC.e (bridged)
  USDC_NATIVE: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',       // Native USDC
};

// --- Types ---

export interface OrderBookEntry {
  price: string;
  size: string;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  hash: string;
  timestamp: string;
}

export interface CLOBMarket {
  condition_id: string;
  question_id: string;
  tokens: {
    token_id: string;
    outcome: string;
    price: number;
    winner: boolean;
  }[];
  rewards: { min_size: number; max_spread: number; event_start_date: string } | null;
  minimum_order_size: number;
  minimum_tick_size: number;
  description: string;
  category: string;
  end_date_iso: string;
  game_start_time: string;
  question: string;
  market_slug: string;
  min_incentive_size: string;
  max_incentive_spread: string;
  active: boolean;
  closed: boolean;
  accepting_orders: boolean;
  accepting_order_timestamp: string;
}

export interface TradeParams {
  tokenId: string;      // The outcome token ID to buy/sell
  side: 'BUY' | 'SELL';
  amount: number;        // In USDC (before fee)
  price: number;         // Limit price (0-1)
  orderType: 'GTC' | 'FOK' | 'GTD'; // Good til cancelled, Fill or Kill, Good til date
  expiration?: number;   // Unix timestamp for GTD orders
}

export interface Order {
  id: string;
  status: 'LIVE' | 'MATCHED' | 'CANCELLED' | 'DELAYED';
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  original_size: string;
  size_matched: string;
  price: string;
  outcome: string;
  created_at: number;
  expiration: number;
  type: string;
}

export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  last_update: string;
  outcome: string;
  bucket_index: number;
  title: string;
}

// --- API Client ---

export class CLOBClient {
  private apiKey?: string;
  private apiSecret?: string;
  private apiPassphrase?: string;

  constructor(credentials?: { apiKey: string; apiSecret: string; apiPassphrase: string }) {
    if (credentials) {
      this.apiKey = credentials.apiKey;
      this.apiSecret = credentials.apiSecret;
      this.apiPassphrase = credentials.apiPassphrase;
    }
  }

  // --- Public Endpoints (no auth required) ---

  /**
   * Get all active markets from the CLOB
   */
  async getMarkets(nextCursor?: string): Promise<{ data: CLOBMarket[]; next_cursor: string }> {
    const params = new URLSearchParams();
    if (nextCursor) params.set('next_cursor', nextCursor);
    const res = await fetch(`${CLOB_BASE}/markets?${params}`);
    return res.json();
  }

  /**
   * Get a specific market by condition ID
   */
  async getMarket(conditionId: string): Promise<CLOBMarket> {
    const res = await fetch(`${CLOB_BASE}/markets/${conditionId}`);
    return res.json();
  }

  /**
   * Get order book for a specific token
   */
  async getOrderBook(tokenId: string): Promise<OrderBook> {
    const res = await fetch(`${CLOB_BASE}/book?token_id=${tokenId}`);
    return res.json();
  }

  /**
   * Get midpoint price for a token
   */
  async getMidpoint(tokenId: string): Promise<{ mid: string }> {
    const res = await fetch(`${CLOB_BASE}/midpoint?token_id=${tokenId}`);
    return res.json();
  }

  /**
   * Get spread for a token
   */
  async getSpread(tokenId: string): Promise<{ spread: string }> {
    const res = await fetch(`${CLOB_BASE}/spread?token_id=${tokenId}`);
    return res.json();
  }

  /**
   * Get recent trades for a market
   */
  async getMarketTrades(conditionId: string): Promise<Trade[]> {
    const res = await fetch(`${CLOB_BASE}/trades?market=${conditionId}`);
    return res.json();
  }

  /**
   * Get price history (time series) for a token
   */
  async getPriceHistory(tokenId: string, interval: '1m' | '5m' | '1h' | '1d' = '1m', fidelity = 60): Promise<{ history: { t: number; p: number }[] }> {
    const res = await fetch(`${CLOB_BASE}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`);
    return res.json();
  }

  // --- Authenticated Endpoints ---
  // These require API key credentials from Polymarket
  // Users generate keys at: https://polymarket.com/settings/api

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
      throw new Error('API credentials required for authenticated endpoints');
    }
    const timestamp = Math.floor(Date.now() / 1000).toString();
    return {
      'POLY_API_KEY': this.apiKey,
      'POLY_TIMESTAMP': timestamp,
      'POLY_PASSPHRASE': this.apiPassphrase,
      // Note: In production, POLY_SIGNATURE should be HMAC-SHA256 of
      // (timestamp + method + path + body) using apiSecret
      // For full implementation, use @polymarket/clob-client npm package
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get API key info and trading status
   */
  async getApiKeyInfo(): Promise<{ apiKey: string; enableTrading: boolean }> {
    const res = await fetch(`${CLOB_BASE}/api-key`, { headers: this.getAuthHeaders() });
    return res.json();
  }

  /**
   * Get open orders
   */
  async getOpenOrders(market?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (market) params.set('market', market);
    const res = await fetch(`${CLOB_BASE}/orders?${params}`, { headers: this.getAuthHeaders() });
    return res.json();
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${CLOB_BASE}/order/${orderId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  /**
   * Cancel all open orders
   */
  async cancelAll(): Promise<{ success: boolean }> {
    const res = await fetch(`${CLOB_BASE}/cancel-all`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }
}

// --- Helper Functions ---

/**
 * Find all crypto short-term markets (BTC/ETH/SOL up/down)
 */
export async function findCryptoShortTermMarkets(): Promise<CLOBMarket[]> {
  const client = new CLOBClient();
  const allMarkets: CLOBMarket[] = [];
  let cursor = '';

  // Paginate through all markets
  for (let i = 0; i < 10; i++) {
    const { data, next_cursor } = await client.getMarkets(cursor || undefined);
    allMarkets.push(...data);
    if (next_cursor === 'LTE=' || !next_cursor) break;
    cursor = next_cursor;
  }

  // Filter for crypto short-term
  const keywords = ['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'crypto'];
  const timeframes = ['15m', '1h', '4h', 'up or down', 'above', 'below'];

  return allMarkets.filter(m => {
    const q = (m.question + ' ' + m.market_slug).toLowerCase();
    const isCrypto = keywords.some(kw => q.includes(kw));
    const isShortTerm = timeframes.some(tf => q.includes(tf));
    return isCrypto && isShortTerm && m.active && !m.closed && m.accepting_orders;
  });
}

/**
 * Get the best available price from the order book
 */
export function getBestPrice(book: OrderBook, side: 'BUY' | 'SELL'): number | null {
  if (side === 'BUY') {
    // Best ask (lowest sell price)
    if (!book.asks.length) return null;
    return parseFloat(book.asks[0].price);
  } else {
    // Best bid (highest buy price)
    if (!book.bids.length) return null;
    return parseFloat(book.bids[0].price);
  }
}

/**
 * Calculate the effective cost including 1% agent fee
 */
export function calcCostWithFee(amount: number, price: number, feeBps = 100): {
  shares: number;
  cost: number;
  fee: number;
  total: number;
} {
  const shares = amount / price;
  const cost = amount;
  const fee = (amount * feeBps) / 10000;
  return { shares, cost, fee, total: cost + fee };
}

/**
 * Calculate potential payout for a binary market position
 */
export function calcPayout(shares: number, won: boolean): number {
  // In binary markets: if you win, each share pays $1. If you lose, $0.
  return won ? shares : 0;
}
