-- PolyAgent Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet text NOT NULL REFERENCES users(wallet_address),
  market_id text NOT NULL,
  market_question text NOT NULL,
  token_id text NOT NULL,
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  amount numeric NOT NULL,
  price numeric NOT NULL,
  shares numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'settled')),
  pnl numeric,
  tx_hash text,
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz
);

-- Agent logs table
CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet text,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'success', 'warn', 'error')),
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Market scans table (TA engine results)
CREATE TABLE IF NOT EXISTS market_scans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id text NOT NULL,
  market_question text NOT NULL,
  signal text,
  signal_strength numeric,
  rsi numeric,
  macd_signal numeric,
  vwap_delta numeric,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_wallet);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user ON agent_logs(user_wallet);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_scans_created ON market_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- RLS (Row Level Security) - enable but allow anon for now
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_scans ENABLE ROW LEVEL SECURITY;

-- Policies: allow anon read/write (agent needs server-side access)
CREATE POLICY "Allow anon full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON agent_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON market_scans FOR ALL USING (true) WITH CHECK (true);
