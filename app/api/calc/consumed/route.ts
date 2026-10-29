import { NextResponse } from 'next/server';
import { clearCalcResults, ensureConsumer, getCalcResults } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureConsumer();
    const results = getCalcResults();
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cleared = clearCalcResults();
    return NextResponse.json({ success: true, cleared });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
