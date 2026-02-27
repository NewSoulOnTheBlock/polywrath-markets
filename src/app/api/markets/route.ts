import { NextResponse } from 'next/server';
import { fetchCryptoMarkets } from '@/lib/polymarket';

export async function GET() {
  const markets = await fetchCryptoMarkets();
  return NextResponse.json(markets);
}
