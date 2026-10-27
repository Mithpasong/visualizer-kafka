import { NextResponse } from 'next/server';
import { sendVote, VOTE_OPTIONS, type VoteOptionId } from '@/lib/kafka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function randomVoter() {
  return `voter-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(5, '0')}`;
}

function randomVoteId() {
  return `V-${Date.now().toString(36).toUpperCase()}-${Math.floor(
    Math.random() * 1000
  )}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const option = (body.option ?? pickRandomOption()) as VoteOptionId;
    if (!VOTE_OPTIONS.some((o) => o.id === option)) {
      return NextResponse.json(
        { success: false, error: `unknown option: ${option}` },
        { status: 400 }
      );
    }
    const vote = {
      voteId: body.voteId ?? randomVoteId(),
      voter: body.voter ?? randomVoter(),
      option,
      createdAt: new Date().toISOString(),
    };
    const meta = await sendVote(vote);
    return NextResponse.json({ success: true, vote, meta });
  } catch (err: any) {
    console.error('produce error', err);
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

function pickRandomOption(): VoteOptionId {
  return VOTE_OPTIONS[Math.floor(Math.random() * VOTE_OPTIONS.length)].id;
}
