import { NextResponse } from 'next/server';
import { ensureConsumer, getPartitionMessages } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureConsumer();
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic');
    const partitionStr = url.searchParams.get('partition');
    if (!topic || partitionStr === null) {
      return NextResponse.json(
        { success: false, error: 'topic 과 partition 파라미터가 필요합니다' },
        { status: 400 }
      );
    }
    const partition = Number(partitionStr);
    if (!Number.isInteger(partition) || partition < 0) {
      return NextResponse.json(
        { success: false, error: 'partition 은 0 이상의 정수여야 합니다' },
        { status: 400 }
      );
    }
    const messages = getPartitionMessages(topic, partition);
    return NextResponse.json({
      success: true,
      topic,
      partition,
      count: messages.length,
      messages,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
