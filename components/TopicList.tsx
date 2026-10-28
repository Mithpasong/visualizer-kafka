"use client";

import type { TopicMeta } from "./Dashboard";
import { colorForTopic } from "@/lib/colors";

interface Props {
  topics: TopicMeta[];
  onDelete: (name: string) => void;
  highlightedTopic: string | null;
  showInternal: boolean;
  onToggleInternal: () => void;
}

export default function TopicList({
  topics,
  onDelete,
  highlightedTopic,
  showInternal,
  onToggleInternal,
}: Props) {
  const userTopics = topics.filter((t) => !t.isInternal);
  const internalTopics = topics.filter((t) => t.isInternal);
  const totalUnderReplicated = topics.reduce(
    (sum, t) =>
      sum +
      t.partitions.filter((p) => p.isr.length < t.replicationFactor).length,
    0
  );

  return (
    <div className="h-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold">
            T
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Topic 목록 · {userTopics.length}개
            </h2>
            <p className="text-xs text-zinc-500">
              {totalUnderReplicated > 0 && (
                <span className="text-amber-400">
                  ⚠ Under-replicated 파티션 {totalUnderReplicated}개 ·{" "}
                </span>
              )}
              실시간 폴링
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInternal}
            onChange={onToggleInternal}
            className="accent-sky-500"
          />
          시스템 토픽 표시 ({internalTopics.length})
        </label>
      </div>

      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 scroll-fade">
        {userTopics.length === 0 && !showInternal && (
          <div className="text-xs text-zinc-600 italic text-center py-10 border border-dashed border-zinc-800 rounded-lg">
            아직 생성된 Topic이 없습니다.
            <br />
            왼쪽에서 새 Topic을 만들어 보세요
          </div>
        )}

        {topics.map((topic) => {
          const color = colorForTopic(topic.name);
          const isHighlighted = highlightedTopic === topic.name;
          const underReplicated = topic.partitions.filter(
            (p) => p.isr.length < topic.replicationFactor
          ).length;

          return (
            <div
              key={topic.name}
              className={`p-3 rounded-lg border transition-all ${
                isHighlighted
                  ? "bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/20 scale-[1.01]"
                  : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`}
                  />
                  <span
                    className={`font-mono text-sm font-semibold truncate ${
                      topic.isInternal ? "text-zinc-500" : "text-white"
                    }`}
                  >
                    {topic.name}
                  </span>
                  {isHighlighted && (
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.5 rounded-full animate-pulse">
                      NEW
                    </span>
                  )}
                  {topic.isInternal && (
                    <span className="text-[9px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
                      SYSTEM
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-shrink-0">
                  <span>
                    P:{" "}
                    <span className="text-white font-mono">
                      {topic.numPartitions}
                    </span>
                  </span>
                  <span>
                    RF:{" "}
                    <span className="text-white font-mono">
                      {topic.replicationFactor}
                    </span>
                  </span>
                  {underReplicated > 0 && (
                    <span
                      className="text-amber-400"
                      title={`${underReplicated}개 파티션이 복제본 부족`}
                    >
                      ⚠{underReplicated}
                    </span>
                  )}
                  {!topic.isInternal && (
                    <button
                      onClick={() => onDelete(topic.name)}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 hover:border-red-500/50 transition"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {topic.partitions.map((p) => (
                  <div
                    key={p.partition}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${color.bg} ${color.border} ${color.text}`}
                    title={`Partition ${p.partition}: Leader=Broker ${p.leader}, Replicas=[${p.replicas.join(",")}], ISR=[${p.isr.join(",")}]`}
                  >
                    P{p.partition}
                    <span className="opacity-70 ml-1">L:{p.leader}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
