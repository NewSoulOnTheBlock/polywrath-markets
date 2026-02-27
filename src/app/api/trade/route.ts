import { NextResponse } from 'next/server';
import { calcCostWithFee } from '@/lib/clob-client';

const CLOB_BASE = 'https://clob.polymarket.com';
const POLY_API_KEY = process.env.POLY_API_KEY || 'pa_5240ece1de71df63dfad8c8c380d17074f24603d423919a43d5c3b7ee5ad9c32';

async function placeClobOrder(tokenId: string, side: 'BUY' | 'SELL', size: number, price: number) {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Place a market order via the CLOB REST API
  const orderPayload = {
    order: {
      tokenID: tokenId,
      price: price.toString(),
      size: size.toString(),
      side: side,
      feeRateBps: '0',
      nonce: '0',
      expiration: '0',
      taker: '0x0000000000000000000000000000000000000000',
    },
    orderType: 'FOK', // Fill or Kill for immediate execution
    negRisk: false,
  };

  const res = await fetch(`${CLOB_BASE}/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'POLY_API_KEY': POLY_API_KEY,
      'POLY_TIMESTAMP': timestamp,
      'POLY_PASSPHRASE': '',
    },
    body: JSON.stringify(orderPayload),
  });

  const data = await res.json();
  return { status: res.status, data };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tokenId, side, amount, price, userAddress } = body;

    if (!tokenId || !side || !amount || !price || !userAddress) {
      return NextResponse.json({ error: 'Missing required fields: tokenId, side, amount, price, userAddress' }, { status: 400 });
    }

    // Calculate fee
    const costBreakdown = calcCostWithFee(amount, price);
    const shares = costBreakdown.shares;

    // Attempt to place real order on Polymarket CLOB
    const clobResult = await placeClobOrder(tokenId, side, shares, price);

    if (clobResult.status === 200 || clobResult.status === 201) {
      return NextResponse.json({
        status: 'submitted',
        order: {
          tokenId,
          side,
          amount,
          price,
          userAddress,
          shares: shares.toFixed(2),
          fee: costBreakdown.fee.toFixed(2),
          total: costBreakdown.total.toFixed(2),
          potentialPayout: shares.toFixed(2),
        },
        clobResponse: clobResult.data,
        message: 'Order submitted to Polymarket CLOB',
      });
    } else {
      return NextResponse.json({
        status: 'error',
        order: {
          tokenId,
          side,
          amount,
          price,
          userAddress,
          shares: shares.toFixed(2),
          fee: costBreakdown.fee.toFixed(2),
          total: costBreakdown.total.toFixed(2),
        },
        clobResponse: clobResult.data,
        message: `CLOB returned ${clobResult.status}: ${JSON.stringify(clobResult.data)}`,
      }, { status: 422 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Trade failed: ' + (err instanceof Error ? err.message : 'unknown') }, { status: 500 });
  }
}
