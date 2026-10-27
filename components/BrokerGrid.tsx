"use client";

import type { BrokerMeta, PartitionMeta } from "./Dashboard";

interface Props {
  brokers: BrokerMeta[];
  partitions: PartitionMeta[];
  controller: number;
  partitionTallies: Record<number, number>;
}

export default function BrokerGrid({
  brokers,
  partitions,
  controller,
  partitionTallies,
}: Props) {
  const partitionsByBroker = new Map<number, { partition: number; role: "L" | "F" }[]>();
  for (const b of brokers) partitionsByBroker.set(b.id, []);
  for (const p of partitions) {
    for (const replicaId of p.replicas) {
      if (!partitionsByBroker.has(replicaId))
        partitionsByBroker.set(replicaId, []);
      partitionsByBroker.get(replicaId)!.push({
        partition: p.partition,
        role: p.leader === replicaId ? "L" : "F",
      });
    }
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold">
            K
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Kafka Cluster · Broker 6대
            </h2>
            <p className="text-xs text-zinc-500">
              Topic <code className="text-orange-300">votes</code> ·
              Partition 6 · Replication Factor 3
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          Controller:{" "}
          <span className="text-amber-400 font-mono">
            Broker {controller}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {brokers
          .sort((a, b) => a.id - b.id)
          .map((broker) => {
            const myPartitions = partitionsByBroker.get(broker.id) ?? [];
            const isController = broker.id === controller;
            return (
              <div
                key={broker.id}
                className={`p-2.5 rounded-lg border bg-zinc-950/60 ${
                  isController
                    ? "border-amber-500/50"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Broker {broker.id}
                    {isController && (
                      <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-500/50 px-1 rounded">
                        CTRL
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    :{broker.port}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {myPartitions.length === 0 && (
                    <span className="text-[10px] text-zinc-600 italic">
                      (파티션 없음)
                    </span>
                  )}
                  {myPartitions
                    .sort((a, b) => a.partition - b.partition)
                    .map((p) => {
                      const count = partitionTallies[p.partition] ?? 0;
                      return (
                        <div
                          key={p.partition}
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                            p.role === "L"
                              ? "bg-orange-500/20 border-orange-500/50 text-orange-200"
                              : "bg-zinc-800/60 border-zinc-700 text-zinc-400"
                          }`}
                          title={`Partition ${p.partition} - ${
                            p.role === "L" ? "Leader" : "Follower"
                          } - 메시지 ${count}건`}
                        >
                          P{p.partition}
                          <span className="opacity-70 ml-0.5">
                            {p.role === "L" ? "★" : "·"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-orange-500/50 border border-orange-500/50" />
          Leader (★)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-zinc-800 border border-zinc-700" />
          Follower (·)
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="text-amber-300 font-mono text-[9px] bg-amber-500/30 border border-amber-500/50 px-1 rounded">
            CTRL
          </span>
          Controller
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 mb-1.5">파티션별 메시지 분포</div>
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: 6 }).map((_, i) => {
            const count = partitionTallies[i] ?? 0;
            const max = Math.max(1, ...Object.values(partitionTallies));
            const height = Math.round((count / max) * 100);
            return (
              <div
                key={i}
                className="flex flex-col items-center"
                title={`P${i}: ${count}건`}
              >
                <div className="w-full h-12 bg-zinc-950 rounded flex items-end overflow-hidden border border-zinc-800">
                  <div
                    className="w-full bg-gradient-to-t from-orange-500/70 to-orange-500/30 transition-all"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                  P{i}
                </div>
                <div className="text-[9px] text-zinc-400 font-mono">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
