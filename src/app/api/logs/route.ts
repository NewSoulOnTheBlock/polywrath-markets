import { NextResponse } from 'next/server';
import { getAgentLogs, insertAgentLog } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const logs = await getAgentLogs(limit, wallet);
  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  try {
    const { level, message, userWallet, metadata } = await req.json();
    await insertAgentLog(level, message, userWallet, metadata);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to insert log' }, { status: 500 });
  }
}
