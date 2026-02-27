import { NextResponse } from 'next/server';
import { getUserTrades, insertTrade } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  
  const trades = await getUserTrades(wallet);
  return NextResponse.json(trades);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const trade = await insertTrade(body);
    return NextResponse.json(trade);
  } catch {
    return NextResponse.json({ error: 'Failed to insert trade' }, { status: 500 });
  }
}
