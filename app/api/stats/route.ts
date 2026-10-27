import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getSnapshot();
    return NextResponse.json({ success: true, ...snapshot });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
