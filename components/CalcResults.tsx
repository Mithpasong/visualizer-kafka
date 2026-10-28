"use client";

import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";

export interface CalcResultItem {
  id: string;
  topic: string;
  partition: number;
  offset: string;
  key: string;
  input: { numbers: number[]; operator: string };
  result: number | string;
  consumedAt: string;
}

const OP_LABEL: Record<string, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

export default function CalcResults() {
  const { t } = useT();
  const [results, setResults] = useState<CalcResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 2000) return t("calcResults.ago.justNow");
    if (diff < 60000)
      return t("calcResults.ago.seconds", { n: Math.floor(diff / 1000) });
    if (diff < 3600000)
      return t("calcResults.ago.minutes", { n: Math.floor(diff / 60000) });
    return t("calcResults.ago.hours", { n: Math.floor(diff / 3600000) });
  };

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch("/api/calc/consumed", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          if (data.success) {
            setResults(data.results);
            setError(null);
          } else {
            setError(data.error);
          }
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

  return (
    <div className="h-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 font-bold">
          C
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">
            {t("calcResults.title")}
          </h2>
          <p className="text-xs text-zinc-500">
            {t("calcResults.subtitle", { count: results.length })}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 scroll-fade">
        {results.length === 0 && (
          <div className="text-xs text-zinc-600 italic text-center py-10 border border-dashed border-zinc-800 rounded-lg">
            {t("calcResults.empty")}
            <br />
            {t("calcResults.emptyHint")}
          </div>
        )}
        {results.map((r) => (
          <div
            key={`${r.topic}-${r.partition}-${r.offset}-${r.id}`}
            className="bg-violet-500/5 border border-violet-500/20 rounded px-3 py-2 animate-slide-in"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="font-mono text-violet-200 truncate">
                [{r.input.numbers.join(", ")}]{" "}
                <span className="text-violet-300 font-bold mx-1">
                  {OP_LABEL[r.input.operator] ?? r.input.operator}
                </span>{" "}
                → <span className="text-white font-bold">{String(r.result)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1 font-mono">
              <span>
                {r.topic} · P{r.partition} · off {r.offset}
                {r.key ? ` · key=${r.key}` : ""}
              </span>
              <span>{timeAgo(r.consumedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
