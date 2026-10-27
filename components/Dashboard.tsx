"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VotePanel from "./VotePanel";
import BrokerGrid from "./BrokerGrid";
import VoteResults from "./VoteResults";
import LiveFeed from "./LiveFeed";

export interface VoteMessage {
  voteId: string;
  option: string;
  voter: string;
  createdAt: string;
}

export interface ConsumedRecord {
  partition: number;
  offset: string;
  key: string;
  value: VoteMessage;
  consumedAt: string;
}

export interface VoteOption {
  id: string;
  label: string;
  color: string;
}

export interface Group {
  id: string;
  label: string;
}

export interface Snapshot {
  topic: string;
  partitionCount: number;
  replicationFactor: number;
  voteOptions: VoteOption[];
  groups: Group[];
  produced: ConsumedRecord[];
  consumed: Record<string, ConsumedRecord[]>;
  tallies: Record<string, number>;
  partitionTallies: Record<number, number>;
  totalVotes: number;
}

export interface PartitionMeta {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
}

export interface BrokerMeta {
  id: number;
  host: string;
  port: number;
}

export interface BrokersResponse {
  brokers: BrokerMeta[];
  controller: number;
  partitions: PartitionMeta[];
}

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [brokers, setBrokers] = useState<BrokersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoVote, setAutoVote] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, brokersRes] = await Promise.all([
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/brokers", { cache: "no-store" }),
      ]);
      const stats = await statsRes.json();
      const brokers = await brokersRes.json();
      if (stats.success) setSnapshot(stats);
      else setError(stats.error);
      if (brokers.success) setBrokers(brokers);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    }
  }, []);

  const vote = useCallback(
    async (option?: string) => {
      try {
        await fetch("/api/produce", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(option ? { option } : {}),
        });
      } catch {}
    },
    []
  );

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  useEffect(() => {
    if (autoVote) {
      autoTimer.current = setInterval(() => vote(), 800);
    }
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [autoVote, vote]);

  const connected = !!snapshot && !error;

  return (
    <main className="min-h-screen p-6 max-w-[1800px] mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Kafka Cluster 실시간 투표
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Broker 6대 클러스터 · 가장 좋아하는 프로그래밍 언어는?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              connected
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              }`}
            />
            {connected
              ? `Cluster 연결됨 (${brokers?.brokers.length ?? "?"}대 Broker)`
              : "연결 끊김"}
          </span>
          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-300"
          >
            Kafka UI 열기 ↗
          </a>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          <strong>연결 실패:</strong> {error}
          <div className="mt-1 text-xs text-red-400/80">
            6개 Broker 모두 떠있는지 확인하세요: <code>docker compose ps</code>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 xl:col-span-3">
          <VotePanel
            options={snapshot?.voteOptions ?? []}
            onVote={vote}
            autoVote={autoVote}
            onToggleAuto={() => setAutoVote((v) => !v)}
            totalVotes={snapshot?.totalVotes ?? 0}
          />
        </section>

        <section className="col-span-12 xl:col-span-6 space-y-4">
          <BrokerGrid
            brokers={brokers?.brokers ?? []}
            partitions={brokers?.partitions ?? []}
            controller={brokers?.controller ?? -1}
            partitionTallies={snapshot?.partitionTallies ?? {}}
          />
          <VoteResults
            options={snapshot?.voteOptions ?? []}
            tallies={snapshot?.tallies ?? {}}
            totalVotes={snapshot?.totalVotes ?? 0}
          />
        </section>

        <section className="col-span-12 xl:col-span-3">
          <LiveFeed
            records={snapshot?.consumed["live-feed"] ?? []}
            options={snapshot?.voteOptions ?? []}
          />
        </section>
      </div>

      <footer className="mt-8 text-xs text-zinc-500 text-center">
        topic: <code className="text-zinc-400">votes</code> · partitions: 6 ·
        replication: 3 · brokers: 6 · consumer groups: 2
      </footer>
    </main>
  );
}
