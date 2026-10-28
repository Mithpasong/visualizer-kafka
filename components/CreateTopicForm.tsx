"use client";

import { useState } from "react";

interface Props {
  onCreate: (
    name: string,
    numPartitions: number,
    replicationFactor: number
  ) => Promise<boolean>;
  maxBrokers: number;
}

export default function CreateTopicForm({ onCreate, maxBrokers }: Props) {
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
          <h2 className="text-sm font-semibold text-white">새 Topic 생성</h2>
          <p className="text-xs text-zinc-500">
            Admin API로 Kafka 클러스터에 Topic 추가
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            Topic 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: user-events"
            pattern="[A-Za-z0-9._\-]+"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono"
          />
          <p className="text-[10px] text-zinc-600 mt-1">
            영문/숫자/._- 만 가능
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Partitions
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
              Replication
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
              Broker {maxBrokers}대 → 최대 RF {maxBrokers}
            </p>
          </div>
        </div>

        <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 text-xs text-zinc-400 space-y-1">
          <div>
            총 Partition 복제본:{" "}
            <span className="text-white font-mono">
              {numPartitions * rfCapped}개
            </span>
          </div>
          <div>
            Broker당 평균:{" "}
            <span className="text-white font-mono">
              {Math.ceil((numPartitions * rfCapped) / Math.max(1, maxBrokers))}개
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition"
        >
          {submitting ? "생성 중..." : "Topic 생성 →"}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-zinc-800 text-[10px] text-zinc-600 space-y-1">
        <p>💡 생성 후 아래 Broker Grid 에서 파티션 분산이 즉시 보임</p>
        <p>💡 Replication Factor &gt; 1 이면 복제본이 다른 Broker에 분산됨</p>
      </div>
    </div>
  );
}
