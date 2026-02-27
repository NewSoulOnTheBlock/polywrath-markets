import { NextResponse } from 'next/server';

// Crypto Fear & Greed Index
// Docs: https://alternative.me/crypto/fear-and-greed-index/

const FNG_URL = 'https://api.alternative.me/fng/?limit=1&format=json';

interface FngResponse {
  data: { value: string; value_classification: string; timestamp: string }[];
}

export async function GET() {
  try {
    const res = await fetch(FNG_URL, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`FNG error ${res.status}`);
    const json = (await res.json()) as FngResponse;
    const latest = json.data[0];

    const payload = {
      value: parseInt(latest.value, 10),
      classification: latest.value_classification,
      timestamp: parseInt(latest.timestamp, 10) * 1000,
      ts: Date.now(),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error('Fear & Greed fetch failed:', err);
    return NextResponse.json({ error: 'Failed to fetch Fear & Greed index' }, { status: 500 });
  }
}
