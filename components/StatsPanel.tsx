"use client";

import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";

export interface StatsSnapshot {
  totalMessages: number;
  operatorCounts: Record<"+" | "-" | "*" | "/", number>;
  topicCounts: Record<string, number>;
  partitionCounts: Record<string, Record<number, number>>;
  lastConsumedAt: string | null;
  startedAt: string | null;
  groupId: string | null;
}

const OP_LABEL: Record<string, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

const OP_COLORS: Record<string, string> = {
  "+": "bg-emerald-500",
  "-": "bg-amber-500",
  "*": "bg-cyan-500",
  "/": "bg-fuchsia-500",
};

const EMPTY_STATS: StatsSnapshot = {
  totalMessages: 0,
  operatorCounts: { "+": 0, "-": 0, "*": 0, "/": 0 },
  topicCounts: {},
  partitionCounts: {},
  lastConsumedAt: null,
  startedAt: null,
  groupId: null,
};

export default function StatsPanel() {
  const { t } = useT();
  const [stats, setStats] = useState<StatsSnapshot>(EMPTY_STATS);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<"clear" | "refresh" | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setStats(data.stats);
          setError(null);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? String(err));
      }
    };
    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const timeAgo = (iso: string | null): string => {
    if (!iso) return t("stats.never");
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 2000) return t("calcResults.ago.justNow");
    if (diff < 60000)
      return t("calcResults.ago.seconds", { n: Math.floor(diff / 1000) });
    if (diff < 3600000)
      return t("calcResults.ago.minutes", { n: Math.floor(diff / 60000) });
    return t("calcResults.ago.hours", { n: Math.floor(diff / 3600000) });
  };

  const clearStats = async () => {
    if (!confirm(t("stats.confirmClear"))) return;
    setWorking("clear");
    try {
      const res = await fetch("/api/stats", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStats((prev) => ({ ...EMPTY_STATS, groupId: prev.groupId }));
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setWorking(null);
    }
  };

  const refreshConsumer = async () => {
    if (!confirm(t("stats.confirmRefresh"))) return;
    setWorking("refresh");
    try {
      const res = await fetch("/api/stats/refresh", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (data.stats) setStats(data.stats);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setWorking(null);
    }
  };

  const operators: ("+" | "-" | "*" | "/")[] = ["+", "-", "*", "/"];
  const maxOp = Math.max(1, ...operators.map((o) => stats.operatorCounts[o]));
  const topicEntries = Object.entries(stats.topicCounts)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="bg-zinc-900/60 border border-cyan-500/20 rounded-xl p-5">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shrink-0">
            S
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
              {t("stats.title", { total: stats.totalMessages })}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-normal">
                {t("stats.fanoutBadge")}
              </span>
            </h2>
            <p className="text-xs text-zinc-500 font-mono truncate">
              {stats.groupId ?? t("stats.notStarted")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshConsumer}
            disabled={working !== null}
            className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:text-cyan-300 hover:border-cyan-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title={t("stats.refreshTooltip")}
          >
            {working === "refresh"
              ? t("stats.refreshing")
              : t("stats.refreshBtn")}
          </button>
          <button
            type="button"
            onClick={clearStats}
            disabled={working !== null || stats.totalMessages === 0}
            className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-red-300 hover:border-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title={t("stats.clearTooltip")}
          >
            {working === "clear" ? t("stats.clearing") : t("stats.clearBtn")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2">
            {t("stats.operatorsLabel")}
          </div>
          <div className="space-y-1.5">
            {operators.map((o) => {
              const count = stats.operatorCounts[o];
              const pct = (count / maxOp) * 100;
              return (
                <div key={o} className="flex items-center gap-2 text-xs">
                  <span className="w-5 font-mono font-bold text-zinc-300 text-center">
                    {OP_LABEL[o]}
                  </span>
                  <div className="flex-1 h-4 bg-zinc-800/60 rounded overflow-hidden">
                    <div
                      className={`h-full ${OP_COLORS[o]} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-zinc-300">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2">
            {t("stats.topicsLabel")}
          </div>
          {topicEntries.length === 0 ? (
            <div className="text-[11px] text-zinc-600 italic">
              {t("stats.topicsEmpty")}
            </div>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {topicEntries.map(([name, count]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-2 text-xs bg-zinc-800/40 border border-zinc-800 rounded px-2 py-1"
                >
                  <span className="font-mono text-zinc-200 truncate">
                    {name}
                  </span>
                  <span className="font-mono font-bold text-cyan-300 shrink-0">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2">
            {t("stats.partitionsLabel")}
          </div>
          {topicEntries.length === 0 ? (
            <div className="text-[11px] text-zinc-600 italic">
              {t("stats.partitionsEmpty")}
            </div>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {topicEntries.map(([name]) => {
                const parts = stats.partitionCounts[name] ?? {};
                const partEntries = Object.entries(parts)
                  .map(([p, c]) => [Number(p), c] as const)
                  .sort(([a], [b]) => a - b);
                return (
                  <div
                    key={name}
                    className="flex items-center gap-1 text-[10px] flex-wrap"
                  >
                    <span className="font-mono text-zinc-500 w-full truncate">
                      {name}
                    </span>
                    {partEntries.map(([p, c]) => (
                      <span
                        key={p}
                        className="font-mono bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 px-1.5 py-0.5 rounded"
                      >
                        P{p}:{c}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500 flex-wrap gap-2">
        <span>
          {t("stats.startedAt")} {timeAgo(stats.startedAt)}
        </span>
        <span>
          {t("stats.lastSeen")} {timeAgo(stats.lastConsumedAt)}
        </span>
      </div>
    </div>
  );
}
