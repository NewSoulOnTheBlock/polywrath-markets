import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agent-trading';
import { authenticateRequest } from '@/lib/auth';

// POST /api/agent/trade — Execute a trade signal (requires auth)
export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { signalIndex, config } = body;

    const agent = getAgent(config);

    // Scan for signals
    const signals = await agent.scanMarkets();

    if (signals.length === 0) {
      return NextResponse.json({
        status: 'no_signals',
        message: 'No trade signals found above threshold',
        config: agent.getConfig(),
      });
    }

    // Execute the specified signal (or the strongest one)
    const idx = signalIndex ?? 0;
    if (idx >= signals.length) {
      return NextResponse.json({ error: 'Signal index out of range' }, { status: 400 });
    }

    const apiKey = req.headers.get('authorization')?.split(' ')[1] || '';
    const execution = await agent.executeTrade(signals[idx], apiKey);

    return NextResponse.json({
      execution,
      allSignals: signals.length,
      config: agent.getConfig(),
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Trade failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
