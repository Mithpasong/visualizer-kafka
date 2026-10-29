import { NextResponse } from 'next/server';
import { clearStats, ensureStatsConsumer, getStats } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureStatsConsumer();
    const stats = getStats();
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearStats();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
