"use client";

import { useMemo, useState } from "react";
import type { TopicMeta } from "./Dashboard";
import { useT } from "./I18nProvider";

interface Props {
  topics: TopicMeta[];
  onPublished: (info: {
    topic: string;
    partition: number;
    offset: string;
  }) => void;
  onError: (message: string) => void;
}

const OPERATORS: { op: "+" | "-" | "*" | "/"; label: string }[] = [
  { op: "+", label: "+" },
  { op: "-", label: "-" },
  { op: "*", label: "×" },
  { op: "/", label: "÷" },
];

export default function CalcProducer({ topics, onPublished, onError }: Props) {
  const { t } = useT();
  const userTopics = useMemo(
    () => topics.filter((t) => !t.isInternal),
    [topics]
  );
  const [topic, setTopic] = useState<string>("");
  const [numbersText, setNumbersText] = useState("1, 2, 3, 4, 5");
  const [operator, setOperator] = useState<"+" | "-" | "*" | "/">("+");
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!topic && userTopics.length > 0) {
    setTopic(userTopics[0].name);
  }

  const parseNumbers = (text: string): number[] | null => {
    const parts = text
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const nums: number[] = [];
    for (const p of parts) {
      const n = Number(p);
      if (!Number.isFinite(n)) return null;
      nums.push(n);
    }
    return nums.length > 0 ? nums : null;
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) {
      onError(t("calcProducer.selectTopicFirst"));
      return;
    }
    const nums = parseNumbers(numbersText);
    if (!nums) {
      onError(t("calcProducer.badNumbers"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/calc/produce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, operator, numbers: nums, key }),
      });
      const data = await res.json();
      if (!data.success) {
        onError(data.error);
        return;
      }
      onPublished({
        topic: data.topic,
        partition: data.partition,
        offset: data.offset,
      });
    } catch (err: any) {
      onError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const refreshConsumer = async () => {
    try {
      await fetch("/api/calc/refresh", { method: "POST" });
    } catch {}
  };

  return (
    <div className="h-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            P
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {t("calcProducer.title")}
            </h2>
            <p className="text-xs text-zinc-500">
              {t("calcProducer.subtitle")}
            </p>
          </div>
        </div>
        <button
          onClick={refreshConsumer}
          className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
          title={t("calcProducer.refreshTooltip")}
        >
          {t("calcProducer.refreshBtn")}
        </button>
      </div>

      <form onSubmit={handlePublish} className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            {t("calcProducer.topicLabel")}
          </label>
          {userTopics.length === 0 ? (
            <div className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-500 italic">
              {t("calcProducer.topicEmpty")}
            </div>
          ) : (
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/60 font-mono"
            >
              {userTopics.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} (P:{t.numPartitions}, RF:{t.replicationFactor})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            {t("calcProducer.numbersLabel")}
          </label>
          <input
            type="text"
            value={numbersText}
            onChange={(e) => setNumbersText(e.target.value)}
            placeholder="1, 2, 3, 4, 5"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 font-mono"
          />
          <p className="text-[10px] text-zinc-600 mt-1">
            {t("calcProducer.numbersHint")}
          </p>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            {t("calcProducer.operatorLabel")}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {OPERATORS.map((o) => (
              <button
                key={o.op}
                type="button"
                onClick={() => setOperator(o.op)}
                className={`py-2 rounded-lg border font-bold text-lg transition ${
                  operator === o.op
                    ? "bg-amber-500/30 border-amber-500/60 text-amber-200"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            {t("calcProducer.keyLabel")}
          </label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t("calcProducer.keyPlaceholder")}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 font-mono"
          />
          <p className="text-[10px] text-zinc-600 mt-1">
            {t("calcProducer.keyHint")}
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || !topic || userTopics.length === 0}
          className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition"
        >
          {submitting ? t("calcProducer.submitting") : t("calcProducer.submit")}
        </button>
      </form>
    </div>
  );
}
