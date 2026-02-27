import { NextResponse } from 'next/server';
import { CLOBClient } from '@/lib/clob-client';

export async function GET(_req: Request, { params }: { params: { tokenId: string } }) {
  try {
    const client = new CLOBClient();
    const book = await client.getOrderBook(params.tokenId);
    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch order book' }, { status: 500 });
  }
}
