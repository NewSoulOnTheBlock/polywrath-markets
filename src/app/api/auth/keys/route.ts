import { NextResponse } from 'next/server';
import { getKeysForAddress, authenticateRequest, revokeApiKey } from '@/lib/auth';

// GET /api/auth/keys - List your API keys (requires auth)
export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const keys = getKeysForAddress(auth.address!);
  return NextResponse.json({ address: auth.address, keys });
}

// DELETE /api/auth/keys - Revoke an API key
export async function DELETE(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey required' }, { status: 400 });
    }

    const revoked = revokeApiKey(apiKey);
    if (!revoked) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
