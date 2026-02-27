'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface AgentLog {
  time: string;
  msg: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

interface AgentState {
  active: boolean;
  logs: AgentLog[];
  toggleAgent: (marketCount: number, vaultBalance: string) => void;
}

const AgentContext = createContext<AgentState>({
  active: false,
  logs: [],
  toggleAgent: () => {},
});

export function useAgent() {
  return useContext(AgentContext);
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('polyagent_active');
    const storedLogs = localStorage.getItem('polyagent_logs');
    if (stored === 'true') setActive(true);
    if (storedLogs) {
      try { setLogs(JSON.parse(storedLogs)); } catch { /* ignore */ }
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('polyagent_active', String(active));
  }, [active]);

  useEffect(() => {
    localStorage.setItem('polyagent_logs', JSON.stringify(logs.slice(0, 50)));
  }, [logs]);

  const addLog = useCallback((msg: string, type: AgentLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 50));
  }, []);

  // Periodic scanning when active
  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => {
        const msgs = [
          'Scanning order books...',
          'Calculating RSI divergence...',
          'Checking VWAP levels...',
          'Analyzing Heiken Ashi candles...',
          'No signal — holding position.',
          'Market volatility low — waiting for breakout.',
          'MACD crossover detected — evaluating...',
          'Signal strength below threshold — skipping.',
        ];
        addLog(msgs[Math.floor(Math.random() * msgs.length)]);
      }, 8000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, addLog]);

  const toggleAgent = useCallback(async (marketCount: number, vaultBalance: string) => {
    if (active) {
      setActive(false);
      addLog('Agent shutting down...', 'warn');
      setTimeout(() => addLog('Agent stopped.', 'warn'), 600);
      return;
    }

    setActive(true);
    addLog('Activating agent...');
    await new Promise(r => setTimeout(r, 500));
    addLog('Connecting to Polymarket CLOB...');
    await new Promise(r => setTimeout(r, 800));
    addLog('Loading TA engine (RSI, MACD, VWAP, Heiken Ashi)...');
    await new Promise(r => setTimeout(r, 600));
    addLog('TA engine loaded.', 'success');
    await new Promise(r => setTimeout(r, 400));
    addLog(`Scanning ${marketCount} crypto short-term markets...`);
    await new Promise(r => setTimeout(r, 700));

    const balance = parseFloat(vaultBalance);
    if (balance <= 0) {
      addLog('No vault balance. Deposit USDC to enable trading.', 'error');
      addLog('Agent in watch-only mode — monitoring markets.', 'warn');
    } else {
      addLog(`Vault balance: $${vaultBalance} USDC ready.`, 'success');
      addLog('Agent armed. Scanning for signals...', 'success');
    }
  }, [active, addLog]);

  return (
    <AgentContext.Provider value={{ active, logs, toggleAgent }}>
      {children}
    </AgentContext.Provider>
  );
}
