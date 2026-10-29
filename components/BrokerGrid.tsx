"use client";

import type { BrokerMeta, TopicMeta } from "./Dashboard";
import { FALLBACK_COLOR, type TopicColor } from "@/lib/colors";
import { useT } from "./I18nProvider";

interface Props {
  brokers: BrokerMeta[];
  topics: TopicMeta[];
  controller: number;
  highlightedTopic: string | null;
  justCreatedTopic?: string | null;
  justPublishedPartition?: { topic: string; partition: number } | null;
  onPartitionClick?: (topic: string, partition: number) => void;
  topicColors: Map<string, TopicColor>;
  onBrokerAction?: (id: number, action: "stop" | "start") => void;
  pendingBrokerAction?: { id: number; action: "stop" | "start" } | null;
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
  justCreatedTopic,
  justPublishedPartition,
  onPartitionClick,
  topicColors,
  onBrokerAction,
  pendingBrokerAction,
}: Props) {
  const { t } = useT();
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
              {t("brokerGrid.title", { count: brokers.length })}
            </h2>
            <p className="text-xs text-zinc-500">{t("brokerGrid.subtitle")}</p>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          {t("brokerGrid.controller")}{" "}
          <span className="text-amber-400 font-mono">
            {t("brokerGrid.controllerBrokerPrefix")}{" "}
            {controller >= 0 ? controller : "?"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {brokers
          .sort((a, b) => a.id - b.id)
          .map((broker) => {
            const assignments = broker.alive
              ? byBroker.get(broker.id) ?? []
              : [];
            const isController = broker.id === controller && broker.alive;
            const isDown = !broker.alive;
            const isPending = pendingBrokerAction?.id === broker.id;
            const pendingAction = pendingBrokerAction?.action;

            const byTopic = new Map<string, PartitionAssignment[]>();
            for (const a of assignments) {
              if (!byTopic.has(a.topic)) byTopic.set(a.topic, []);
              byTopic.get(a.topic)!.push(a);
            }

            return (
              <div
                key={broker.id}
                className={`relative p-3 rounded-lg border min-h-[160px] transition-all duration-500 ${
                  isDown
                    ? "bg-zinc-950/40 border-red-500/30 opacity-70"
                    : isController
                    ? "bg-zinc-950/60 border-amber-500/50"
                    : "bg-zinc-950/60 border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDown
                          ? "bg-red-500"
                          : "bg-emerald-400 animate-pulse"
                      }`}
                    />
                    <span className={isDown ? "text-zinc-500" : "text-white"}>
                      Broker {broker.id}
                    </span>
                    {isController && (
                      <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-500/50 px-1 rounded">
                        CTRL
                      </span>
                    )}
                    {isDown && (
                      <span className="text-[9px] bg-red-500/30 text-red-300 border border-red-500/50 px-1 rounded">
                        {t("brokerGrid.downBadge")}
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
                      {t("brokerGrid.noPartitions")}
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
                            .map((p) => {
                              const isJustCreated =
                                justCreatedTopic === topicName;
                              const isJustPublished =
                                p.role === "L" &&
                                justPublishedPartition?.topic === topicName &&
                                justPublishedPartition?.partition ===
                                  p.partition;
                              return (
                                <div
                                  key={p.partition}
                                  className="relative inline-block"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPartitionClick?.(
                                        topicName,
                                        p.partition
                                      );
                                    }}
                                    className={`text-[9px] px-1 py-0.5 rounded font-mono cursor-pointer transition hover:brightness-125 hover:ring-1 hover:ring-white/40 ${
                                      isJustPublished
                                        ? "border-2 border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)] bg-amber-500/30 text-white animate-jump-big"
                                        : isJustCreated
                                        ? "border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] bg-red-500/20 text-white animate-jump-attn"
                                        : p.role === "L"
                                        ? "bg-black/40 text-white border border-white/20"
                                        : "bg-black/20 text-zinc-300 border border-transparent"
                                    }`}
                                    title={t("brokerGrid.partitionTooltip", {
                                      p: p.partition,
                                      role:
                                        p.role === "L"
                                          ? t("brokerGrid.legendLeader")
                                          : t("brokerGrid.legendFollower"),
                                    })}
                                  >
                                    P{p.partition}
                                    {p.role === "L" ? "★" : ""}
                                  </button>
                                  {isJustPublished && (
                                    <div
                                      className="absolute left-1/2 bottom-full mb-1 z-40 pointer-events-none whitespace-nowrap bg-amber-500 text-black text-[10px] font-semibold px-2 py-1 rounded shadow-lg animate-tooltip-pop"
                                      style={{
                                        transform: "translate(-50%, -8px)",
                                      }}
                                    >
                                      {t("brokerGrid.justPublished")}
                                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-500" />
                                    </div>
                                  )}
                                  {isJustCreated && !isJustPublished && (
                                    <div
                                      className="absolute left-1/2 bottom-full mb-1 z-30 pointer-events-none whitespace-nowrap bg-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg animate-tooltip-pop"
                                      style={{
                                        transform: "translate(-50%, -8px)",
                                      }}
                                    >
                                      {t("brokerGrid.justCreated")}
                                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-500">
                    {isDown
                      ? t("brokerGrid.statusDown")
                      : t("brokerGrid.totalReplicas", {
                          replicas: assignments.length,
                          leaders: assignments.filter((a) => a.role === "L")
                            .length,
                        })}
                  </span>
                  {onBrokerAction && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        onBrokerAction(broker.id, isDown ? "start" : "stop")
                      }
                      className={`text-[10px] px-2 py-0.5 rounded border font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDown
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                          : "bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30"
                      }`}
                      title={
                        isDown
                          ? t("brokerGrid.startTooltip", { id: broker.id })
                          : t("brokerGrid.stopTooltip", { id: broker.id })
                      }
                    >
                      {isPending
                        ? pendingAction === "stop"
                          ? t("brokerGrid.stopping")
                          : t("brokerGrid.starting")
                        : isDown
                        ? t("brokerGrid.startBtn")
                        : t("brokerGrid.stopBtn")}
                    </button>
                  )}
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
          {t("brokerGrid.legendLeader")}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-zinc-300 font-mono bg-black/20 px-1 rounded">
            P1
          </span>
          {t("brokerGrid.legendFollower")}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="text-amber-300 font-mono text-[9px] bg-amber-500/30 border border-amber-500/50 px-1 rounded">
            CTRL
          </span>
          {t("brokerGrid.legendController")}
        </span>
      </div>
    </div>
  );
}
