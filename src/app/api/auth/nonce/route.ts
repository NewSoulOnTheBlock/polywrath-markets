import { NextResponse } from 'next/server';
import { generateNonce, storeNonce } from '@/lib/auth';

// POST /api/auth/nonce - Get a nonce to sign
export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const nonce = generateNonce();
    storeNonce(address, nonce);

    const message = `PolyAgent Authentication\n\nWallet: ${address}\nNonce: ${nonce}\n\nSign this message to generate your API key. This does not cost gas.`;

    return NextResponse.json({ nonce, message });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
