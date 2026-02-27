import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wptsyksznujedrvzvazl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdHN5a3N6bnVqZWRydnp2YXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTc1MzcsImV4cCI6MjA4Nzc3MzUzN30.G9TSbRmJGnyLBYo2cvUt70XpHDmVvGPTT8C-RyN5Q_I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Types for our tables
export interface DbUser {
  id: string;
  wallet_address: string;
  created_at: string;
  last_seen: string;
  settings: Record<string, unknown>;
}

export interface DbTrade {
  id: string;
  user_wallet: string;
  market_id: string;
  market_question: string;
  token_id: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  shares: number;
  fee: number;
  status: 'pending' | 'filled' | 'cancelled' | 'settled';
  pnl: number | null;
  tx_hash: string | null;
  created_at: string;
  settled_at: string | null;
}

export interface DbAgentLog {
  id: string;
  user_wallet: string | null;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DbMarketScan {
  id: string;
  market_id: string;
  market_question: string;
  signal: string | null;
  signal_strength: number | null;
  rsi: number | null;
  macd_signal: number | null;
  vwap_delta: number | null;
  action_taken: string | null;
  created_at: string;
}

// User operations
export async function upsertUser(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .upsert({ 
      wallet_address: walletAddress.toLowerCase(), 
      last_seen: new Date().toISOString() 
    }, { onConflict: 'wallet_address' })
    .select()
    .single();
  if (error) console.error('upsertUser error:', error);
  return data;
}

// Trade operations
export async function insertTrade(trade: Omit<DbTrade, 'id' | 'created_at' | 'settled_at'>) {
  const { data, error } = await supabase.from('trades').insert(trade).select().single();
  if (error) console.error('insertTrade error:', error);
  return data;
}

export async function getUserTrades(walletAddress: string, limit = 50) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_wallet', walletAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('getUserTrades error:', error);
  return data || [];
}

export async function updateTradeStatus(tradeId: string, status: DbTrade['status'], pnl?: number) {
  const update: Record<string, unknown> = { status };
  if (pnl !== undefined) update.pnl = pnl;
  if (status === 'settled') update.settled_at = new Date().toISOString();
  const { error } = await supabase.from('trades').update(update).eq('id', tradeId);
  if (error) console.error('updateTradeStatus error:', error);
}

// Agent log operations
export async function insertAgentLog(level: DbAgentLog['level'], message: string, userWallet?: string, metadata?: Record<string, unknown>) {
  const { error } = await supabase.from('agent_logs').insert({
    user_wallet: userWallet?.toLowerCase() || null,
    level,
    message,
    metadata: metadata || null,
  });
  if (error) console.error('insertAgentLog error:', error);
}

export async function getAgentLogs(limit = 100, userWallet?: string) {
  let query = supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (userWallet) query = query.eq('user_wallet', userWallet.toLowerCase());
  const { data, error } = await query;
  if (error) console.error('getAgentLogs error:', error);
  return data || [];
}

// Market scan operations
export async function insertMarketScan(scan: Omit<DbMarketScan, 'id' | 'created_at'>) {
  const { error } = await supabase.from('market_scans').insert(scan);
  if (error) console.error('insertMarketScan error:', error);
}

export async function getRecentScans(limit = 20) {
  const { data, error } = await supabase
    .from('market_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('getRecentScans error:', error);
  return data || [];
}
