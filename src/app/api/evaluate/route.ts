import { NextResponse } from 'next/server';
import { evaluateMarket } from '@/lib/strategy';

/**
 * GET /api/evaluate?polyUpProb=0.51
 * 
 * Runs the full strategy pipeline:
 *   Phase 1: Data sources (Coinbase, Binance, Fear & Greed)
 *   Phase 2: Ingestion (clean, validate, prevent overload)
 *   Phase 3: Signal processors (Spike, Sentiment, Divergence)
 *   Phase 4: Signal fusion (weighted voting)
 *   → Returns: decision (trade/skip/hold), side (UP/DOWN), signals, snapshot
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const polyUpProb = parseFloat(searchParams.get('polyUpProb') || '0.50');

    if (isNaN(polyUpProb) || polyUpProb < 0 || polyUpProb > 1) {
      return NextResponse.json({ error: 'polyUpProb must be 0–1' }, { status: 400 });
    }

    const result = await evaluateMarket(polyUpProb);

    return NextResponse.json({
      decision: result.decision,
      side: result.side ?? null,
      reason: result.reason ?? null,
      fusedSignal: result.fusedSignal ? {
        direction: result.fusedSignal.direction,
        score: result.fusedSignal.score,
        confidence: result.fusedSignal.confidence,
        isActionable: result.fusedSignal.isActionable,
        isStrong: result.fusedSignal.isStrong,
        metadata: result.fusedSignal.metadata,
      } : null,
      rawSignals: result.rawSignals.map(s => ({
        source: s.source,
        direction: s.direction,
        strength: s.strength,
        confidence: s.confidence,
        score: s.score,
        metadata: s.metadata,
      })),
      snapshot: {
        price: result.snapshot.price,
        spread: result.snapshot.spread,
        volume24h: result.snapshot.volume24h,
        flow: result.snapshot.shortTermFlow,
        sentiment: result.snapshot.sentiment,
        meta: result.snapshot.meta,
      },
    });
  } catch (err) {
    console.error('Evaluate error:', err);
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
  }
}
