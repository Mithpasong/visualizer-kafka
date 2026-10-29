import { NextResponse } from 'next/server';
import { getConsumerConfig, setConsumerConfig } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ success: true, config: getConsumerConfig() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const config = setConsumerConfig({ maxPerSecond: Number(body?.maxPerSecond) });
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
