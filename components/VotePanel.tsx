"use client";

import type { VoteOption } from "./Dashboard";

interface Props {
  options: VoteOption[];
  onVote: (option: string) => void;
  autoVote: boolean;
  onToggleAuto: () => void;
  totalVotes: number;
}

const COLOR_BG: Record<string, string> = {
  yellow: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30",
  sky: "bg-sky-500/20 border-sky-500/40 text-sky-300 hover:bg-sky-500/30",
  orange: "bg-orange-500/20 border-orange-500/40 text-orange-300 hover:bg-orange-500/30",
  cyan: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30",
  red: "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30",
  blue: "bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30",
};

export default function VotePanel({
  options,
  onVote,
  autoVote,
  onToggleAuto,
  totalVotes,
}: Props) {
  return (
    <div className="h-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
          P
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Producer</h2>
          <p className="text-xs text-zinc-500">
            투표를 Kafka로 전송
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onVote(opt.id)}
            className={`w-full py-3 rounded-lg border font-semibold text-sm transition ${
              COLOR_BG[opt.color] ?? COLOR_BG.sky
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none p-2 bg-zinc-950/40 rounded border border-zinc-800">
        <input
          type="checkbox"
          checked={autoVote}
          onChange={onToggleAuto}
          className="accent-amber-500"
        />
        0.8초마다 랜덤 투표 자동 전송
        {autoVote && (
          <span className="ml-auto text-amber-400 animate-pulse">● LIVE</span>
        )}
      </label>

      <div className="mt-4 p-3 bg-zinc-950/40 rounded-lg border border-zinc-800">
        <div className="text-xs text-zinc-500">총 투표 수</div>
        <div className="text-3xl font-bold text-white tabular-nums">
          {totalVotes.toLocaleString()}
        </div>
      </div>

      <div className="mt-4 text-[10px] text-zinc-600 border-t border-zinc-800 pt-3">
        💡 Partition Key = 투표 옵션 ID<br />
        같은 옵션 투표는 항상 같은 Partition으로 들어갑니다
      </div>
    </div>
  );
}
