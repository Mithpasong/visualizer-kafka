import { NextResponse } from 'next/server';
import { deleteTopic } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: { name: string } }
) {
  try {
    const name = decodeURIComponent(params.name);
    if (name.startsWith('__')) {
      return NextResponse.json(
        { success: false, error: '시스템 토픽은 삭제할 수 없습니다' },
        { status: 400 }
      );
    }
    await deleteTopic(name);
    return NextResponse.json({ success: true, name });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
