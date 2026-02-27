import { NextResponse } from 'next/server';
import { fetchMarketBySlug } from '@/lib/polymarket';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const market = await fetchMarketBySlug(params.slug);
  if (!market) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(market);
}
