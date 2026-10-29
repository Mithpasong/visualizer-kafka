import { NextResponse } from 'next/server';
import { refreshStatsConsumer, getStats } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await refreshStatsConsumer();
    return NextResponse.json({ success: true, stats: getStats() });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
