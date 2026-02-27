import { NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { polygon } from 'viem/chains';
import { VAULT_ADDRESS, VAULT_ABI } from '@/lib/contracts';

const client = createPublicClient({
  chain: polygon,
  transport: http('https://1rpc.io/matic'),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  try {
    const userInfo = await client.readContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'getUserInfo',
      args: [address as `0x${string}`],
    });

    const [available, locked, deposited, withdrawn, feesPaid] = userInfo as unknown as bigint[];

    return NextResponse.json({
      address,
      available: formatUnits(available, 6),
      locked: formatUnits(locked, 6),
      totalDeposited: formatUnits(deposited, 6),
      totalWithdrawn: formatUnits(withdrawn, 6),
      totalFeesPaid: formatUnits(feesPaid, 6),
      contract: VAULT_ADDRESS,
    });
  } catch {
    return NextResponse.json({
      address,
      available: '0.00',
      locked: '0.00',
      totalDeposited: '0.00',
      totalWithdrawn: '0.00',
      totalFeesPaid: '0.00',
      contract: VAULT_ADDRESS,
      error: 'Failed to read contract',
    });
  }
}
