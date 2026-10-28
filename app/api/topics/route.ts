import { NextResponse } from 'next/server';
import { createTopic, listTopicsWithMetadata } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeInternal = url.searchParams.get('internal') === 'true';
    const topics = await listTopicsWithMetadata(includeInternal);
    return NextResponse.json({ success: true, topics });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const numPartitions = Number(body.numPartitions ?? 3);
    const replicationFactor = Number(body.replicationFactor ?? 3);

    if (!name) {
      return NextResponse.json(
        { success: false, error: '토픽 이름이 필요합니다' },
        { status: 400 }
      );
    }
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      return NextResponse.json(
        {
          success: false,
          error: '토픽 이름은 영문/숫자/._- 만 사용 가능합니다',
        },
        { status: 400 }
      );
    }
    if (numPartitions < 1 || numPartitions > 50) {
      return NextResponse.json(
        { success: false, error: 'Partition은 1~50 사이여야 합니다' },
        { status: 400 }
      );
    }
    if (replicationFactor < 1 || replicationFactor > 6) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Replication Factor는 1~6 사이여야 합니다 (Broker 수를 초과 불가)',
        },
        { status: 400 }
      );
    }

    const result = await createTopic(name, numPartitions, replicationFactor);
    return NextResponse.json({ success: true, topic: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
