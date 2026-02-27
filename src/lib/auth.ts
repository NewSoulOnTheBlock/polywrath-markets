import crypto from 'crypto';

// API key format: pa_<random 32 hex chars>
export function generateApiKey(): string {
  return `pa_${crypto.randomBytes(32).toString('hex')}`;
}

// Hash API key for storage (never store raw keys)
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Generate a nonce for wallet signature verification
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Build the message the user signs to authenticate
export function buildSignMessage(address: string, nonce: string): string {
  return `PolyAgent Authentication\n\nWallet: ${address}\nNonce: ${nonce}\nTimestamp: ${Date.now()}\n\nSign this message to generate your API key. This does not cost gas.`;
}

// In-memory store (replace with DB in production)
// Structure: { hashedKey: { address, createdAt, lastUsed, active } }
const apiKeys = new Map<string, {
  address: string;
  createdAt: number;
  lastUsed: number;
  active: boolean;
  label: string;
}>();

const nonces = new Map<string, { nonce: string; expires: number }>();

export function storeNonce(address: string, nonce: string) {
  nonces.set(address.toLowerCase(), {
    nonce,
    expires: Date.now() + 5 * 60 * 1000, // 5 min expiry
  });
}

export function validateNonce(address: string, nonce: string): boolean {
  const stored = nonces.get(address.toLowerCase());
  if (!stored) return false;
  if (Date.now() > stored.expires) {
    nonces.delete(address.toLowerCase());
    return false;
  }
  if (stored.nonce !== nonce) return false;
  nonces.delete(address.toLowerCase());
  return true;
}

export function storeApiKey(hashedKey: string, address: string, label: string) {
  apiKeys.set(hashedKey, {
    address: address.toLowerCase(),
    createdAt: Date.now(),
    lastUsed: Date.now(),
    active: true,
    label,
  });
}

export function validateApiKey(key: string): { valid: boolean; address?: string } {
  const hashed = hashApiKey(key);
  const entry = apiKeys.get(hashed);
  if (!entry || !entry.active) return { valid: false };
  entry.lastUsed = Date.now();
  return { valid: true, address: entry.address };
}

export function revokeApiKey(key: string): boolean {
  const hashed = hashApiKey(key);
  const entry = apiKeys.get(hashed);
  if (!entry) return false;
  entry.active = false;
  return true;
}

export function getKeysForAddress(address: string): Array<{
  label: string;
  createdAt: number;
  lastUsed: number;
  active: boolean;
  keyPrefix: string;
}> {
  const results: Array<{
    label: string;
    createdAt: number;
    lastUsed: number;
    active: boolean;
    keyPrefix: string;
  }> = [];
  apiKeys.forEach((entry, hashedKey) => {
    if (entry.address === address.toLowerCase()) {
      results.push({
        label: entry.label,
        createdAt: entry.createdAt,
        lastUsed: entry.lastUsed,
        active: entry.active,
        keyPrefix: `pa_${hashedKey.slice(0, 8)}...`,
      });
    }
  });
  return results;
}

// Middleware helper: extract and validate API key from request
export function authenticateRequest(req: Request): { authenticated: boolean; address?: string; error?: string } {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { authenticated: false, error: 'Missing Authorization header. Use: Authorization: Bearer pa_...' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { authenticated: false, error: 'Invalid Authorization format. Use: Authorization: Bearer pa_...' };
  }

  const key = parts[1];
  if (!key.startsWith('pa_')) {
    return { authenticated: false, error: 'Invalid API key format' };
  }

  const { valid, address } = validateApiKey(key);
  if (!valid) {
    return { authenticated: false, error: 'Invalid or revoked API key' };
  }

  return { authenticated: true, address };
}
