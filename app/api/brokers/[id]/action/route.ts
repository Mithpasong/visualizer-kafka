import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { BROKERS } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);
const ALLOWED_IDS = new Set(BROKERS.map((b) => b.id));

type Action = 'stop' | 'start';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || !ALLOWED_IDS.has(id)) {
    return NextResponse.json(
      { success: false, error: `유효하지 않은 broker id: ${params.id}` },
      { status: 400 }
    );
  }

  let action: Action;
  try {
    const body = await req.json();
    const raw = String(body?.action ?? '');
    if (raw !== 'stop' && raw !== 'start') {
      return NextResponse.json(
        { success: false, error: `action 은 "stop" 또는 "start" 여야 합니다` },
        { status: 400 }
      );
    }
    action = raw;
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON body 필요 (action: "stop" | "start")' },
      { status: 400 }
    );
  }

  const containerName = `kafka-${id}`;
  try {
    const { stdout } = await execFileAsync('docker', [action, containerName], {
      timeout: 30000,
    });
    return NextResponse.json({
      success: true,
      id,
      action,
      container: containerName,
      stdout: stdout.trim(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `docker ${action} ${containerName} 실패: ${
          err?.stderr?.toString().trim() || err?.message || String(err)
        }`,
      },
      { status: 500 }
    );
  }
}
