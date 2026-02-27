import { NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { validateNonce, generateApiKey, hashApiKey, storeApiKey } from '@/lib/auth';

// POST /api/auth/verify - Verify signature, return API key
export async function POST(req: Request) {
  try {
    const { address, signature, nonce, label } = await req.json();

    if (!address || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing address, signature, or nonce' }, { status: 400 });
    }

    // Validate nonce
    if (!validateNonce(address, nonce)) {
      return NextResponse.json({ error: 'Invalid or expired nonce. Request a new one.' }, { status: 401 });
    }

    // Verify the signature
    const message = `PolyAgent Authentication\n\nWallet: ${address}\nNonce: ${nonce}\n\nSign this message to generate your API key. This does not cost gas.`;

    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Generate and store API key
    const apiKey = generateApiKey();
    const hashed = hashApiKey(apiKey);
    storeApiKey(hashed, address, label || 'default');

    return NextResponse.json({
      apiKey,
      address,
      label: label || 'default',
      message: 'API key generated. Store it securely — it will not be shown again.',
      usage: {
        header: 'Authorization: Bearer ' + apiKey,
        endpoints: {
          portfolio: 'GET /api/portfolio',
          trade: 'POST /api/trade',
          history: 'GET /api/history',
          markets: 'GET /api/markets',
        },
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
