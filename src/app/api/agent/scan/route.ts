import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agent-trading';
import { authenticateRequest } from '@/lib/auth';

// GET /api/agent/scan — Scan markets for trade signals (requires auth)
export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const agent = getAgent();
    const signals = await agent.scanMarkets();

    return NextResponse.json({
      scannedAt: new Date().toISOString(),
      config: agent.getConfig(),
      signals,
      count: signals.length,
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Scan failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
