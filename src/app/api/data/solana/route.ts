import { NextResponse } from 'next/server';

// Minimal Solana RPC snapshot: slot + blockTime

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function POST() {
  // Allow POST for RPC-style; delegates to GET
  return GET();
}

export async function GET() {
  try {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getSlot',
      params: [],
    };

    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Solana RPC error ${res.status}`);
    const json = (await res.json()) as { result: number };
    const slot = json.result;

    const payload = {
      slot,
      ts: Date.now(),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error('Solana RPC fetch failed:', err);
    return NextResponse.json({ error: 'Failed to fetch Solana data' }, { status: 500 });
  }
}
