# Poly-Wrath Markets

**Autonomous AI agent that trades Polymarket crypto markets for you.**

Deposit USDC. Set your risk level. Walk away. Poly-Wrath scans every 15-minute BTC, ETH, and SOL prediction market on Polymarket, runs real-time technical analysis, and places trades when signals fire. You keep the profits. 1% fee per trade. No subscriptions. No hidden costs.

**Live:** [polywrathmarkets.xyz](https://polywrathmarkets.xyz)

---

## What It Does

Polymarket lists short-term crypto markets every 15 minutes — "Will BTC go up or down in the next 15 minutes?" These markets resolve automatically via Chainlink price feeds. Poly-Wrath trades them.

The agent runs a full TA engine on every market:
- **RSI** — momentum and overbought/oversold detection
- **MACD** — trend direction and crossover signals
- **VWAP** — volume-weighted fair price deviation
- **Heiken Ashi** — noise-filtered candle patterns
- **Delta Scoring** — composite signal strength from all indicators

When the signal crosses your threshold, the agent places the trade. When the market resolves, you collect.

## How It Works

1. **Connect your wallet** (Polygon network)
2. **Deposit USDC** into the vault smart contract
3. **Enter your API keys** in Settings (see below)
4. **Start the bot** — the agent begins scanning and trading
5. **Collect profits** — withdraw anytime from the vault

## API Keys Required

Poly-Wrath needs two API keys to function. Both are entered in the **Settings** page and stored locally in your browser — they never touch our servers.

### OpenAI API Key

The agent uses OpenAI for market analysis inference. This runs on YOUR key so you control the cost.

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Paste it in Settings → **OpenAI API Key**

### Polymarket API Credentials

Required for placing real trades on the Polymarket CLOB (order book). You need all three values:

1. Go to [polymarket.com](https://polymarket.com) → Settings → API Keys
2. Generate a new API key
3. Save the **API Key**, **API Secret**, and **Passphrase** (shown only once)
4. Paste all three in Settings → **Polymarket API Credentials**

> **Note:** Polymarket is geo-restricted in some regions. The trading API calls run server-side, but you need a valid Polymarket account to generate API credentials.

## Vault Contract

All deposits go into a verified smart contract on Polygon. No custodial risk from a centralized backend — your funds are on-chain.

- **Contract:** [`0xb21285c26E2b1BcA2c85a41Ab524B5278beF779E`](https://polygonscan.com/address/0xb21285c26E2b1BcA2c85a41Ab524B5278beF779E#code)
- **Network:** Polygon Mainnet
- **USDC:** Bridged USDC.e (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`)
- **Verified:** Yes — read the source on Polygonscan

The contract enforces:
- Only you can withdraw your funds
- 1% fee deducted per trade (not on deposits or withdrawals)
- Agent can only trade with deposited funds, never withdraw to itself
- Emergency pause by contract owner if needed

## Fee Structure

| Action | Fee |
|--------|-----|
| Deposit | Free |
| Withdraw | Free |
| Per Trade | 1% of notional |

That's it. No monthly fee. No performance fee. No hidden spreads.

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, RainbowKit
- **Chain:** Polygon (USDC.e)
- **Smart Contract:** Solidity 0.8.20, OpenZeppelin, verified on Polygonscan
- **Market Data:** Polymarket Gamma API + CLOB API
- **TA Engine:** Custom TypeScript implementation (RSI, MACD, VWAP, Heiken Ashi)
- **Database:** Supabase (trade history, agent logs, market scans)
- **Deployment:** Vercel

## Run Locally

```bash
git clone https://github.com/NewSoulOnTheBlock/polywrath-markets.git
cd polywrath-markets
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Disciple of the Order of the ZeitGaist

Built different. Trades harder.
