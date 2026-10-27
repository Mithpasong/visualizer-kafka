"use client";

import type { VoteOption } from "./Dashboard";

interface Props {
  options: VoteOption[];
  tallies: Record<string, number>;
  totalVotes: number;
}

const COLOR_BAR: Record<string, string> = {
  yellow: "from-yellow-500 to-yellow-400",
  sky: "from-sky-500 to-sky-400",
  orange: "from-orange-500 to-orange-400",
  cyan: "from-cyan-500 to-cyan-400",
  red: "from-red-500 to-red-400",
  blue: "from-blue-500 to-blue-400",
};

const COLOR_TEXT: Record<string, string> = {
  yellow: "text-yellow-300",
  sky: "text-sky-300",
  orange: "text-orange-300",
  cyan: "text-cyan-300",
  red: "text-red-300",
  blue: "text-blue-300",
};

export default function VoteResults({ options, tallies, totalVotes }: Props) {
  const maxCount = Math.max(1, ...options.map((o) => tallies[o.id] ?? 0));

  const sorted = [...options].sort(
    (a, b) => (tallies[b.id] ?? 0) - (tallies[a.id] ?? 0)
  );

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
            C
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Consumer Group · vote-counter
            </h2>
            <p className="text-xs text-zinc-500">
              모든 투표를 소비하면서 옵션별로 집계
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          집계 총 <span className="text-white font-semibold">{totalVotes}</span>표
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((opt) => {
          const count = tallies[opt.id] ?? 0;
          const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          const widthPercent = (count / maxCount) * 100;
          return (
            <div key={opt.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-semibold ${COLOR_TEXT[opt.color]}`}>
                  {opt.label}
                </span>
                <span className="text-zinc-400 tabular-nums">
                  {count.toLocaleString()}표{" "}
                  <span className="text-zinc-600">({percent.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-6 bg-zinc-950 rounded border border-zinc-800 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${
                    COLOR_BAR[opt.color] ?? COLOR_BAR.sky
                  } transition-all duration-500`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
