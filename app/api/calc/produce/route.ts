import { NextResponse } from 'next/server';
import { publishCalc, type CalcOperator } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = String(body.topic ?? '').trim();
    const operator = String(body.operator ?? '') as CalcOperator;
    const numbers = body.numbers;
    const key = typeof body.key === 'string' ? body.key : undefined;

    if (!topic) {
      return NextResponse.json(
        { success: false, error: 'Topic 선택이 필요합니다' },
        { status: 400 }
      );
    }
    if (!['+', '-', '*', '/'].includes(operator)) {
      return NextResponse.json(
        { success: false, error: `연산자가 올바르지 않습니다: ${operator}` },
        { status: 400 }
      );
    }
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json(
        { success: false, error: '숫자 배열이 비어있습니다' },
        { status: 400 }
      );
    }
    const parsedNumbers: number[] = [];
    for (const n of numbers) {
      const num = Number(n);
      if (!Number.isFinite(num)) {
        return NextResponse.json(
          { success: false, error: `숫자 아닌 값: ${n}` },
          { status: 400 }
        );
      }
      parsedNumbers.push(num);
    }

    const meta = await publishCalc(topic, { numbers: parsedNumbers, operator }, key);
    return NextResponse.json({ success: true, ...meta });
  } catch (err: any) {
    console.error('calc produce error', err);
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
