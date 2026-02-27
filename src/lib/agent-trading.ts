/**
 * Agent Trading Engine
 * 
 * Uses the PolyAgent API key to authorize trades through the vault,
 * and connects to Polymarket CLOB to execute orders.
 */

import { CLOBClient, findCryptoShortTermMarkets } from './clob-client';
import { computeTA, type Candle } from './ta-engine';

// Agent configuration
// Agent API key for CLOB authorization
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AGENT_API_KEY = 'pa_0cb739aefd9e6183ec87719b7657d0b0c6b1a660a762df6d703008d1eaaea9ee';

export interface AgentConfig {
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  maxPositionSize: number; // In USDC
  markets: { btc: boolean; eth: boolean; sol: boolean };
  autoTrade: boolean;
  signalThreshold: number; // Minimum signal strength to trade (0-100)
}

const DEFAULT_CONFIG: AgentConfig = {
  riskLevel: 'moderate',
  maxPositionSize: 100,
  markets: { btc: true, eth: true, sol: true },
  autoTrade: false,
  signalThreshold: 55,
};

// Risk level → signal threshold mapping
const RISK_THRESHOLDS = {
  conservative: 70,
  moderate: 55,
  aggressive: 50,
};

export interface TradeSignal {
  market: string;
  slug: string;
  tokenId: string;
  side: 'BUY_UP' | 'BUY_DOWN';
  price: number;
  signal: 'LONG' | 'SHORT';
  strength: number;
  ta: ReturnType<typeof computeTA>;
  suggestedSize: number;
}

export interface TradeExecution {
  signal: TradeSignal;
  status: 'pending' | 'submitted' | 'filled' | 'failed';
  orderId?: string;
  txHash?: string;
  error?: string;
  timestamp: number;
}

export class AgentTradingEngine {
  private clob: CLOBClient;
  private config: AgentConfig;
  private executions: TradeExecution[] = [];

  constructor(config?: Partial<AgentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.config.signalThreshold = RISK_THRESHOLDS[this.config.riskLevel];
    
    // Initialize CLOB client (public endpoints for now)
    // TODO: Add Polymarket CLOB credentials for order placement
    this.clob = new CLOBClient();
  }

  /**
   * Scan all crypto short-term markets and generate trade signals
   */
  async scanMarkets(): Promise<TradeSignal[]> {
    const markets = await findCryptoShortTermMarkets();
    const signals: TradeSignal[] = [];

    for (const market of markets) {
      if (!market.tokens || market.tokens.length < 2) continue;
      if (!this.isMarketEnabled(market.question)) continue;

      try {
        // Get price history for TA
        const upToken = market.tokens[0];
        const history = await this.clob.getPriceHistory(upToken.token_id, '1m', 60);
        
        if (!history.history || history.history.length < 14) continue;

        // Convert to candles for TA engine
        const candles: Candle[] = history.history.map((h, i) => ({
          open: i > 0 ? history.history[i - 1].p : h.p,
          high: h.p * 1.001,
          low: h.p * 0.999,
          close: h.p,
          volume: 1000, // Approximate
          timestamp: h.t,
        }));

        // Run TA
        const ta = computeTA(candles);

        // Check if signal is strong enough
        if (ta.strength >= this.config.signalThreshold) {
          const side = ta.signal === 'LONG' ? 'BUY_UP' : 'BUY_DOWN';
          const tokenId = ta.signal === 'LONG' ? market.tokens[0].token_id : market.tokens[1].token_id;
          const price = ta.signal === 'LONG' ? market.tokens[0].price : market.tokens[1].price;

          // Calculate position size based on signal strength and max position
          const strengthMultiplier = ta.strength / 100;
          const suggestedSize = Math.min(
            this.config.maxPositionSize * strengthMultiplier,
            this.config.maxPositionSize
          );

          signals.push({
            market: market.question,
            slug: market.market_slug,
            tokenId,
            side,
            price,
            signal: ta.signal as 'LONG' | 'SHORT',
            strength: ta.strength,
            ta,
            suggestedSize: Math.round(suggestedSize * 100) / 100,
          });
        }
      } catch {
        // Skip markets that fail
        continue;
      }
    }

    // Sort by signal strength descending
    return signals.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Execute a trade based on a signal
   */
  async executeTrade(signal: TradeSignal, userApiKey: string): Promise<TradeExecution> {
    const execution: TradeExecution = {
      signal,
      status: 'pending',
      timestamp: Date.now(),
    };

    try {
      // Verify user API key
      const authRes = await fetch('/api/auth/keys', {
        headers: { Authorization: `Bearer ${userApiKey}` },
      });
      
      if (!authRes.ok) {
        execution.status = 'failed';
        execution.error = 'Invalid API key';
        return execution;
      }

      // Submit trade to our API
      execution.status = 'submitted';
      const tradeRes = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userApiKey}`,
        },
        body: JSON.stringify({
          tokenId: signal.tokenId,
          side: signal.side === 'BUY_UP' ? 'BUY' : 'BUY',
          amount: signal.suggestedSize,
          price: signal.price,
          marketSlug: signal.slug,
          signal: signal.signal,
          strength: signal.strength,
        }),
      });

      const tradeData = await tradeRes.json();
      
      if (tradeData.error) {
        execution.status = 'failed';
        execution.error = tradeData.error;
      } else {
        execution.status = 'filled';
        execution.orderId = tradeData.order?.id;
      }
    } catch (err) {
      execution.status = 'failed';
      execution.error = err instanceof Error ? err.message : 'Unknown error';
    }

    this.executions.push(execution);
    return execution;
  }

  /**
   * Get recent executions
   */
  getExecutions(): TradeExecution[] {
    return [...this.executions].reverse();
  }

  /**
   * Check if a market type is enabled in config
   */
  private isMarketEnabled(question: string): boolean {
    const q = question.toLowerCase();
    if (q.includes('btc') || q.includes('bitcoin')) return this.config.markets.btc;
    if (q.includes('eth') || q.includes('ethereum')) return this.config.markets.eth;
    if (q.includes('sol') || q.includes('solana')) return this.config.markets.sol;
    return true; // Allow other crypto markets
  }

  /**
   * Update agent configuration
   */
  updateConfig(config: Partial<AgentConfig>) {
    this.config = { ...this.config, ...config };
    if (config.riskLevel) {
      this.config.signalThreshold = RISK_THRESHOLDS[config.riskLevel];
    }
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}

// Singleton agent instance
let agentInstance: AgentTradingEngine | null = null;

export function getAgent(config?: Partial<AgentConfig>): AgentTradingEngine {
  if (!agentInstance) {
    agentInstance = new AgentTradingEngine(config);
  } else if (config) {
    agentInstance.updateConfig(config);
  }
  return agentInstance;
}
