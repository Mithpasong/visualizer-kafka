"use client";

import { useState } from "react";
import { useT } from "./I18nProvider";

interface Props {
  onCreate: (
    name: string,
    numPartitions: number,
    replicationFactor: number
  ) => Promise<boolean>;
  maxBrokers: number;
}

export default function CreateTopicForm({ onCreate, maxBrokers }: Props) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [numPartitions, setNumPartitions] = useState(3);
  const [replicationFactor, setReplicationFactor] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onCreate(name.trim(), numPartitions, replicationFactor);
    setSubmitting(false);
    if (ok) {
      setName("");
    }
  };

  const rfCapped = Math.min(replicationFactor, maxBrokers);

  return (
    <div className="h-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
          +
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">
            {t("createTopic.title")}
          </h2>
          <p className="text-xs text-zinc-500">{t("createTopic.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            {t("createTopic.nameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("createTopic.namePlaceholder")}
            pattern="[A-Za-z0-9._\-]+"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono"
          />
          <p className="text-[10px] text-zinc-600 mt-1">
            {t("createTopic.nameHint")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              {t("createTopic.partitionsLabel")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="12"
                value={numPartitions}
                onChange={(e) => setNumPartitions(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="number"
                min="1"
                max="50"
                value={numPartitions}
                onChange={(e) => setNumPartitions(Number(e.target.value))}
                className="w-14 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              {t("createTopic.replicationLabel")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max={Math.max(1, maxBrokers)}
                value={rfCapped}
                onChange={(e) => setReplicationFactor(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="number"
                min="1"
                max={maxBrokers}
                value={rfCapped}
                onChange={(e) => setReplicationFactor(Number(e.target.value))}
                className="w-14 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white text-center"
              />
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">
              {t("createTopic.replicationHint", { count: maxBrokers })}
            </p>
          </div>
        </div>

        <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 text-xs text-zinc-400 space-y-1">
          <div>
            {t("createTopic.summaryReplicas", {
              n: numPartitions * rfCapped,
            })}
          </div>
          <div>
            {t("createTopic.summaryPerBroker", {
              n: Math.ceil((numPartitions * rfCapped) / Math.max(1, maxBrokers)),
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition"
        >
          {submitting ? t("createTopic.submitting") : t("createTopic.submit")}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-zinc-800 text-[10px] text-zinc-600 space-y-1">
        <p>{t("createTopic.tip1")}</p>
        <p>{t("createTopic.tip2")}</p>
      </div>
    </div>
  );
}
