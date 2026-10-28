"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CreateTopicForm from "./CreateTopicForm";
import TopicList from "./TopicList";
import BrokerGrid from "./BrokerGrid";
import CalcProducer from "./CalcProducer";
import CalcResults from "./CalcResults";
import PartitionViewer from "./PartitionViewer";
import { assignTopicColors } from "@/lib/colors";

export interface PartitionMeta {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
}

export interface TopicMeta {
  name: string;
  partitions: PartitionMeta[];
  numPartitions: number;
  replicationFactor: number;
  isInternal: boolean;
}

export interface BrokerMeta {
  id: number;
  host: string;
  port: number;
}

export interface Notice {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export default function Dashboard() {
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [brokers, setBrokers] = useState<BrokerMeta[]>([]);
  const [controller, setController] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [highlightedTopic, setHighlightedTopic] = useState<string | null>(null);
  const [showInternal, setShowInternal] = useState(false);
  const [viewer, setViewer] = useState<{
    topic: string;
    partition: number;
  } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        fetch(`/api/topics?internal=${showInternal}`, { cache: "no-store" }),
        fetch("/api/brokers", { cache: "no-store" }),
      ]);
      const t = await tRes.json();
      const b = await bRes.json();
      if (t.success) {
        setTopics(t.topics);
        setError(null);
      } else {
        setError(t.error);
      }
      if (b.success) {
        setBrokers(b.brokers);
        setController(b.controller);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    }
  }, [showInternal]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 1500);
    return () => clearInterval(id);
  }, [fetchAll]);

  const pushNotice = useCallback((n: Omit<Notice, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    const notice: Notice = { id, ...n };
    setNotices((prev) => [...prev, notice]);
    setTimeout(() => {
      setNotices((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const createTopic = useCallback(
    async (name: string, numPartitions: number, replicationFactor: number) => {
      try {
        const res = await fetch("/api/topics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, numPartitions, replicationFactor }),
        });
        const data = await res.json();
        if (!data.success) {
          pushNotice({ type: "error", message: `실패: ${data.error}` });
          return false;
        }
        pushNotice({
          type: "success",
          message: `✓ "${name}" 토픽 생성 (파티션 ${numPartitions}, RF ${replicationFactor})`,
        });
        setHighlightedTopic(name);
        setTimeout(() => setHighlightedTopic(null), 5000);
        fetchAll();
        return true;
      } catch (err: any) {
        pushNotice({ type: "error", message: err?.message ?? String(err) });
        return false;
      }
    },
    [fetchAll, pushNotice]
  );

  const deleteTopic = useCallback(
    async (name: string) => {
      if (!confirm(`"${name}" 토픽을 정말 삭제할까요?`)) return;
      try {
        const res = await fetch(`/api/topics/${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!data.success) {
          pushNotice({ type: "error", message: `삭제 실패: ${data.error}` });
          return;
        }
        pushNotice({ type: "info", message: `"${name}" 삭제됨` });
        fetchAll();
      } catch (err: any) {
        pushNotice({ type: "error", message: err?.message ?? String(err) });
      }
    },
    [fetchAll, pushNotice]
  );

  const topicColors = useMemo(
    () => assignTopicColors(topics.filter((t) => !t.isInternal).map((t) => t.name)),
    [topics]
  );

  const producerRef = useRef<HTMLDivElement>(null);
  const [producerHeight, setProducerHeight] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    const el = producerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 0) setProducerHeight(Math.round(h));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const matchedHeight = producerHeight ? { height: producerHeight } : undefined;

  const connected = brokers.length > 0 && !error;

  return (
    <main className="min-h-screen p-6 max-w-[1800px] mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Kafka Topic Manager
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Next.js에서 Kafka Topic 생성 · 삭제 · 클러스터 분산 시각화
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
              ? `Cluster 연결됨 (${brokers.length}대 Broker)`
              : "Cluster 연결 끊김"}
          </span>
          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-300"
          >
            Kafka UI ↗
          </a>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          <strong>연결 실패:</strong> {error}
          <div className="mt-1 text-xs text-red-400/80">
            Kafka 클러스터가 실행 중인지 확인하세요:{" "}
            <code>docker compose ps</code>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 items-start">
        <section
          className="col-span-12 md:col-span-6 xl:col-span-3"
          style={matchedHeight}
        >
          <CreateTopicForm
            onCreate={createTopic}
            maxBrokers={brokers.length || 6}
          />
        </section>
        <section
          className="col-span-12 md:col-span-6 xl:col-span-3"
          style={matchedHeight}
        >
          <TopicList
            topics={topics}
            onDelete={deleteTopic}
            highlightedTopic={highlightedTopic}
            showInternal={showInternal}
            onToggleInternal={() => setShowInternal((v) => !v)}
            topicColors={topicColors}
          />
        </section>
        <section
          ref={producerRef}
          className="col-span-12 md:col-span-6 xl:col-span-3"
        >
          <CalcProducer
            topics={topics}
            onPublished={(info) => {
              pushNotice({
                type: "success",
                message: `✓ "${info.topic}" P${info.partition} / off ${info.offset} 에 발행됨`,
              });
            }}
            onError={(msg) => pushNotice({ type: "error", message: msg })}
          />
        </section>
        <section
          className="col-span-12 md:col-span-6 xl:col-span-3"
          style={matchedHeight}
        >
          <CalcResults />
        </section>

        <section className="col-span-12">
          <BrokerGrid
            brokers={brokers}
            topics={topics}
            controller={controller}
            highlightedTopic={highlightedTopic}
            onPartitionClick={(topic, partition) =>
              setViewer({ topic, partition })
            }
            topicColors={topicColors}
          />
        </section>
      </div>

      {viewer && (
        <PartitionViewer
          topic={viewer.topic}
          partition={viewer.partition}
          onClose={() => setViewer(null)}
        />
      )}

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {notices.map((n) => (
          <div
            key={n.id}
            className={`px-4 py-3 rounded-lg border shadow-xl text-sm animate-slide-in min-w-[280px] max-w-[480px] ${
              n.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200"
                : n.type === "error"
                ? "bg-red-500/15 border-red-500/50 text-red-200"
                : "bg-zinc-800/90 border-zinc-700 text-zinc-200"
            }`}
          >
            {n.message}
          </div>
        ))}
      </div>

      <footer className="mt-8 text-xs text-zinc-500 text-center">
        bootstrap: <code className="text-zinc-400">localhost:9092,...,9592</code>{" "}
        · 1.5초마다 폴링 · 파티션 블록 클릭 → 저장된 메시지 보기
      </footer>
    </main>
  );
}
