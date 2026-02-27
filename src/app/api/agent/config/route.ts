import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agent-trading';
import { authenticateRequest } from '@/lib/auth';

// GET /api/agent/config — Get agent config
export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  return NextResponse.json(getAgent().getConfig());
}

// POST /api/agent/config — Update agent config
export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const config = await req.json();
    const agent = getAgent(config);
    return NextResponse.json({ updated: true, config: agent.getConfig() });
  } catch {
    return NextResponse.json({ error: 'Invalid config' }, { status: 400 });
  }
}
