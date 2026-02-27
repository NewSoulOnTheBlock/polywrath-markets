import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { polygon } from 'viem/chains';
import { VAULT_ADDRESS } from '@/lib/contracts';

const client = createPublicClient({
  chain: polygon,
  transport: http('https://1rpc.io/matic'),
});

// Event signatures from the vault contract
const tradePlacedEvent = parseAbiItem(
  'event TradePlaced(address indexed user, uint256 amount, uint256 fee, bytes32 marketId)'
);
const tradeSettledEvent = parseAbiItem(
  'event TradeSettled(address indexed user, uint256 payout, bytes32 marketId)'
);
const depositedEvent = parseAbiItem(
  'event Deposited(address indexed user, uint256 amount)'
);
const withdrawnEvent = parseAbiItem(
  'event Withdrawn(address indexed user, uint256 amount)'
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  try {
    // Get the block the contract was deployed at (approximate — use recent blocks)
    // For efficiency, only look back ~50000 blocks (~1 day on Polygon)
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock - BigInt(50000);

    // Fetch trade events for this user
    const [tradeLogs, settleLogs, depositLogs, withdrawLogs] = await Promise.all([
      client.getLogs({
        address: VAULT_ADDRESS,
        event: tradePlacedEvent,
        args: { user: address as `0x${string}` },
        fromBlock,
        toBlock: 'latest',
      }),
      client.getLogs({
        address: VAULT_ADDRESS,
        event: tradeSettledEvent,
        args: { user: address as `0x${string}` },
        fromBlock,
        toBlock: 'latest',
      }),
      client.getLogs({
        address: VAULT_ADDRESS,
        event: depositedEvent,
        args: { user: address as `0x${string}` },
        fromBlock,
        toBlock: 'latest',
      }),
      client.getLogs({
        address: VAULT_ADDRESS,
        event: withdrawnEvent,
        args: { user: address as `0x${string}` },
        fromBlock,
        toBlock: 'latest',
      }),
    ]);

    // Build trade records
    const trades = tradeLogs.map((log) => {
      const args = log.args as { user: string; amount: bigint; fee: bigint; marketId: string };
      const marketId = args.marketId || '0x';
      
      // Check if this trade was settled
      const settlement = settleLogs.find(
        (s) => (s.args as { marketId: string }).marketId === marketId
      );
      
      const amount = parseFloat(formatUnits(args.amount, 6));
      const fee = parseFloat(formatUnits(args.fee, 6));
      let pnl = 0;
      let status: 'placed' | 'won' | 'lost' | 'pending' = 'pending';

      if (settlement) {
        const payout = parseFloat(formatUnits((settlement.args as { payout: bigint }).payout, 6));
        pnl = payout - amount;
        status = pnl >= 0 ? 'won' : 'lost';
      }

      return {
        id: log.transactionHash,
        market: `Market ${marketId.slice(0, 10)}...`,
        side: 'LONG' as const,
        amount,
        fee,
        pnl,
        status,
        timestamp: Number(log.blockNumber),
        txHash: log.transactionHash,
        marketId,
      };
    });

    // Build deposit/withdraw activity
    const deposits = depositLogs.map((log) => ({
      id: log.transactionHash,
      type: 'deposit' as const,
      amount: parseFloat(formatUnits((log.args as { amount: bigint }).amount, 6)),
      timestamp: Number(log.blockNumber),
      txHash: log.transactionHash,
    }));

    const withdrawals = withdrawLogs.map((log) => ({
      id: log.transactionHash,
      type: 'withdraw' as const,
      amount: parseFloat(formatUnits((log.args as { amount: bigint }).amount, 6)),
      timestamp: Number(log.blockNumber),
      txHash: log.transactionHash,
    }));

    return NextResponse.json({
      address,
      trades,
      deposits,
      withdrawals,
      summary: {
        totalTrades: trades.length,
        totalDeposits: deposits.length,
        totalWithdrawals: withdrawals.length,
      },
    });
  } catch (err) {
    console.error('History fetch error:', err);
    return NextResponse.json({
      address,
      trades: [],
      deposits: [],
      withdrawals: [],
      summary: { totalTrades: 0, totalDeposits: 0, totalWithdrawals: 0 },
    });
  }
}
