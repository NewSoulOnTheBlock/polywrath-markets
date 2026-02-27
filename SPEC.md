# Polymarket Agent dApp — Product Spec

## Overview
A browser-based dApp where users connect their wallet, deposit USDC, and an AI agent trades Polymarket crypto short-term markets (BTC, ETH, SOL, etc. — 15m, 1h candles) on their behalf. The agent charges a 1% fee on every order.

## Architecture

### Frontend (Next.js 14 + App Router)
- **Landing page**: Hero explaining the product, live stats, connect wallet CTA
- **Dashboard**: 
  - Portfolio value, P&L, active positions
  - Live market scanner (all crypto short-term markets from Polymarket)
  - Agent activity feed (trades placed, signals detected)
  - Deposit/withdraw USDC
- **Market view**: Individual market detail with TA indicators (RSI, MACD, VWAP, Heiken Ashi)
- **Settings**: Risk level (conservative/moderate/aggressive), max position size, markets to trade

### Wallet & Deposits
- **Connect**: RainbowKit or Web3Modal (MetaMask, WalletConnect, Coinbase Wallet)
- **Chain**: Polygon (Polymarket's native chain)
- **Deposit flow**: User approves USDC → transfers to platform vault contract
- **Vault contract** (Solidity):
  - Accepts USDC deposits per user
  - Tracks balances per user
  - Agent wallet has permission to trade on behalf of depositors
  - 1% fee deducted from each order amount before execution
  - Users can withdraw anytime (minus any open positions)
  - Owner can set agent wallet address
  - Emergency pause functionality

### Trading Engine (Node.js backend / API routes)
- Port the PolymarketBTC15mAssistant TA logic (RSI, MACD, VWAP, Heiken Ashi, delta scoring)
- Expand to all crypto short-term markets on Polymarket (not just BTC)
- Use Polymarket CLOB API for order placement
- Agent logic:
  1. Scan all active crypto short-term markets
  2. Run TA scoring on each
  3. When signal strength > threshold, place order using user's deposited funds
  4. Position sizing based on user's risk setting + available balance
  5. Auto-close positions before market resolution (or hold to resolution)
- Fee collection: 1% of order notional deducted to fee wallet before trade

### Data Sources
- Polymarket API: Market discovery, prices, order book
- Polymarket WS: Live price feeds
- Chainlink (Polygon): BTC/USD, ETH/USD price oracles
- Binance API: Reference spot prices for TA

### Tech Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- wagmi + viem for wallet connection
- ethers.js for contract interaction
- WebSocket for live data
- Prisma + PostgreSQL for user data, trade history
- The TA engine from PolymarketBTC15mAssistant (ported to TypeScript)

## Fee Model
- 1% of every order's notional value
- Collected at trade time, sent to platform fee wallet
- Transparent — shown in the UI before trade confirmation

## V1 Scope (MVP)
1. Landing page + wallet connect
2. USDC deposit/withdraw on Polygon
3. Dashboard with portfolio overview
4. Live market scanner for ALL Polymarket crypto short-term markets
5. TA dashboard per market (RSI, MACD, VWAP, signal)
6. Automated agent trading with 1% fee
7. Trade history + P&L tracking
8. Risk settings (conservative/moderate/aggressive)

## V2 Ideas
- Social features (leaderboard, copy trading)
- Multiple agent strategies users can choose
- Mobile responsive / PWA
- Notifications (Telegram bot for trade alerts)
- Multi-chain deposit (bridge from ETH mainnet, Solana)

## Design
- Dark theme (trading terminal aesthetic)
- Clean, modern — no emoji clutter
- Real-time data feels alive (WebSocket updates, subtle animations)
- Professional but not sterile
