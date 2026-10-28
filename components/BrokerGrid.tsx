"use client";

import type { BrokerMeta, TopicMeta } from "./Dashboard";
import { FALLBACK_COLOR, type TopicColor } from "@/lib/colors";

interface Props {
  brokers: BrokerMeta[];
  topics: TopicMeta[];
  controller: number;
  highlightedTopic: string | null;
  onPartitionClick?: (topic: string, partition: number) => void;
  topicColors: Map<string, TopicColor>;
}

interface PartitionAssignment {
  topic: string;
  partition: number;
  role: "L" | "F";
}

export default function BrokerGrid({
  brokers,
  topics,
  controller,
  highlightedTopic,
  onPartitionClick,
  topicColors,
}: Props) {
  const byBroker = new Map<number, PartitionAssignment[]>();
  for (const b of brokers) byBroker.set(b.id, []);
  for (const t of topics) {
    if (t.isInternal) continue;
    for (const p of t.partitions) {
      for (const replicaId of p.replicas) {
        if (!byBroker.has(replicaId)) byBroker.set(replicaId, []);
        byBroker.get(replicaId)!.push({
          topic: t.name,
          partition: p.partition,
          role: p.leader === replicaId ? "L" : "F",
        });
      }
    }
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold">
            K
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Kafka Cluster · Broker {brokers.length}대
            </h2>
            <p className="text-xs text-zinc-500">
              Topic 파티션이 Broker에 어떻게 분산됐는지 (★=Leader, ·=Follower)
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          Controller:{" "}
          <span className="text-amber-400 font-mono">
            Broker {controller >= 0 ? controller : "?"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {brokers
          .sort((a, b) => a.id - b.id)
          .map((broker) => {
            const assignments = byBroker.get(broker.id) ?? [];
            const isController = broker.id === controller;

            const byTopic = new Map<string, PartitionAssignment[]>();
            for (const a of assignments) {
              if (!byTopic.has(a.topic)) byTopic.set(a.topic, []);
              byTopic.get(a.topic)!.push(a);
            }

            return (
              <div
                key={broker.id}
                className={`p-3 rounded-lg border bg-zinc-950/60 min-h-[160px] transition-colors duration-500 ${
                  isController
                    ? "border-amber-500/50"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Broker {broker.id}
                    {isController && (
                      <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-500/50 px-1 rounded">
                        CTRL
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    :{broker.port}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {assignments.length === 0 && (
                    <div className="text-[11px] text-zinc-600 italic text-center py-4">
                      (저장된 파티션 없음)
                    </div>
                  )}
                  {Array.from(byTopic.entries()).map(([topicName, parts]) => {
                    const color = topicColors.get(topicName) ?? FALLBACK_COLOR;
                    const isHighlighted = highlightedTopic === topicName;
                    return (
                      <div
                        key={topicName}
                        className={`p-1.5 rounded border transition-all ${
                          isHighlighted
                            ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/20"
                            : ""
                        }`}
                        style={
                          isHighlighted
                            ? undefined
                            : {
                                background: color.bg,
                                borderColor: color.border,
                              }
                        }
                      >
                        <div
                          className="text-[10px] font-mono truncate mb-1"
                          style={{
                            color: isHighlighted ? "#a7f3d0" : color.text,
                          }}
                          title={topicName}
                        >
                          {topicName}
                        </div>
                        <div className="flex flex-wrap gap-0.5">
                          {parts
                            .sort((a, b) => a.partition - b.partition)
                            .map((p) => (
                              <button
                                key={p.partition}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPartitionClick?.(topicName, p.partition);
                                }}
                                className={`text-[9px] px-1 py-0.5 rounded font-mono cursor-pointer transition hover:brightness-125 hover:ring-1 hover:ring-white/40 ${
                                  p.role === "L"
                                    ? "bg-black/40 text-white border border-white/20"
                                    : "bg-black/20 text-zinc-300 border border-transparent"
                                }`}
                                title={`클릭: Partition ${p.partition} 메시지 보기 (${
                                  p.role === "L" ? "Leader" : "Follower"
                                })`}
                              >
                                P{p.partition}
                                {p.role === "L" ? "★" : ""}
                              </button>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
                  총{" "}
                  <span className="text-white font-mono">
                    {assignments.length}
                  </span>
                  개 복제본 ·{" "}
                  <span className="text-orange-300 font-mono">
                    {assignments.filter((a) => a.role === "L").length}
                  </span>
                  개 Leader
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="text-white font-mono bg-black/40 border border-white/20 px-1 rounded">
            P0★
          </span>
          Leader
        </span>
        <span className="flex items-center gap-1">
          <span className="text-zinc-300 font-mono bg-black/20 px-1 rounded">
            P1
          </span>
          Follower
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="text-amber-300 font-mono text-[9px] bg-amber-500/30 border border-amber-500/50 px-1 rounded">
            CTRL
          </span>
          Controller Broker
        </span>
      </div>
    </div>
  );
}
