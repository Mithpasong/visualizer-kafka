"use client";

import type { ConsumedRecord, VoteOption } from "./Dashboard";

interface Props {
  records: ConsumedRecord[];
  options: VoteOption[];
}

const COLOR_CHIP: Record<string, string> = {
  yellow: "bg-yellow-500/15 border-yellow-500/40 text-yellow-200",
  sky: "bg-sky-500/15 border-sky-500/40 text-sky-200",
  orange: "bg-orange-500/15 border-orange-500/40 text-orange-200",
  cyan: "bg-cyan-500/15 border-cyan-500/40 text-cyan-200",
  red: "bg-red-500/15 border-red-500/40 text-red-200",
  blue: "bg-blue-500/15 border-blue-500/40 text-blue-200",
};

export default function LiveFeed({ records, options }: Props) {
  const optionMap = Object.fromEntries(options.map((o) => [o.id, o]));

  return (
    <div className="h-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 font-bold">
          C
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">
            Consumer Group · live-feed
          </h2>
          <p className="text-xs text-zinc-500">실시간 투표 스트림</p>
        </div>
      </div>

      <div className="text-[10px] text-zinc-600 mb-2 flex justify-between">
        <span>최근 {records.length}건 표시</span>
        {records.length > 0 && (
          <span className="text-violet-400 animate-pulse">● 수신 중</span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 scroll-fade">
        {records.length === 0 && (
          <div className="text-xs text-zinc-600 italic text-center py-10">
            투표를 전송하면 여기에 표시됩니다
          </div>
        )}
        {records.map((r, i) => {
          const opt = optionMap[r.value.option];
          const chip = COLOR_CHIP[opt?.color ?? "sky"];
          return (
            <div
              key={`${r.offset}-${r.partition}-${i}`}
              className={`text-xs rounded px-2 py-1.5 border animate-slide-in ${chip}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {opt?.label ?? r.value.option}
                </span>
                <span className="text-[9px] opacity-70 font-mono">
                  P{r.partition} · off {r.offset}
                </span>
              </div>
              <div className="text-[10px] opacity-70 mt-0.5">
                {r.value.voter}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
