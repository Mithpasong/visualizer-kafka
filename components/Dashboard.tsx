"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CreateTopicForm from "./CreateTopicForm";
import TopicList from "./TopicList";
import BrokerGrid from "./BrokerGrid";
import CalcProducer from "./CalcProducer";
import CalcResults from "./CalcResults";
import PartitionViewer from "./PartitionViewer";
import LanguageSwitcher from "./LanguageSwitcher";
import LoadingOverlay from "./LoadingOverlay";
import StatsPanel from "./StatsPanel";
import { assignTopicColors } from "@/lib/colors";
import { useT } from "./I18nProvider";

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
  alive: boolean;
}

export interface Notice {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export default function Dashboard() {
  const { t } = useT();
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [brokers, setBrokers] = useState<BrokerMeta[]>([]);
  const [controller, setController] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [highlightedTopic, setHighlightedTopic] = useState<string | null>(null);
  const [justCreatedTopic, setJustCreatedTopic] = useState<string | null>(null);
  const [justPublishedPartition, setJustPublishedPartition] = useState<{
    topic: string;
    partition: number;
    nonce: number;
  } | null>(null);
  const [showInternal, setShowInternal] = useState(false);
  const [pendingOp, setPendingOp] = useState<
    { kind: "create" | "delete"; name: string } | null
  >(null);
  const [pendingBrokerAction, setPendingBrokerAction] = useState<{
    id: number;
    action: "stop" | "start";
  } | null>(null);
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
      setPendingOp({ kind: "create", name });
      try {
        const res = await fetch("/api/topics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, numPartitions, replicationFactor }),
        });
        const data = await res.json();
        if (!data.success) {
          pushNotice({
            type: "error",
            message: t("createTopic.noticeFailed", { msg: data.error }),
          });
          return false;
        }
        pushNotice({
          type: "success",
          message: t("createTopic.noticeCreated", {
            name,
            partitions: numPartitions,
            rf: replicationFactor,
          }),
        });
        setHighlightedTopic(name);
        setTimeout(() => setHighlightedTopic(null), 5000);
        setJustCreatedTopic(name);
        setTimeout(() => setJustCreatedTopic(null), 1500);
        await fetchAll();
        return true;
      } catch (err: any) {
        pushNotice({ type: "error", message: err?.message ?? String(err) });
        return false;
      } finally {
        setPendingOp(null);
      }
    },
    [fetchAll, pushNotice, t]
  );

  const deleteTopic = useCallback(
    async (name: string) => {
      if (!confirm(t("topicList.confirmDelete", { name }))) return;
      setPendingOp({ kind: "delete", name });
      try {
        const res = await fetch(`/api/topics/${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!data.success) {
          pushNotice({
            type: "error",
            message: t("topicList.noticeDeleteFailed", { msg: data.error }),
          });
          return;
        }
        pushNotice({
          type: "info",
          message: t("topicList.noticeDeleted", { name }),
        });
        await fetchAll();
      } catch (err: any) {
        pushNotice({ type: "error", message: err?.message ?? String(err) });
      } finally {
        setPendingOp(null);
      }
    },
    [fetchAll, pushNotice, t]
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

  const aliveBrokers = useMemo(() => brokers.filter((b) => b.alive), [brokers]);
  const connected = aliveBrokers.length > 0 && !error;

  const brokerAction = useCallback(
    async (id: number, action: "stop" | "start") => {
      const msgKey =
        action === "stop"
          ? "brokerGrid.confirmStop"
          : "brokerGrid.confirmStart";
      if (!confirm(t(msgKey, { id }))) return;
      setPendingBrokerAction({ id, action });
      try {
        const res = await fetch(`/api/brokers/${id}/action`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (!data.success) {
          pushNotice({
            type: "error",
            message: t("brokerGrid.actionFailed", {
              id,
              action,
              msg: data.error,
            }),
          });
          return;
        }
        pushNotice({
          type: action === "stop" ? "info" : "success",
          message: t(
            action === "stop"
              ? "brokerGrid.noticeStopped"
              : "brokerGrid.noticeStarted",
            { id }
          ),
        });
        await fetchAll();
      } catch (err: any) {
        pushNotice({ type: "error", message: err?.message ?? String(err) });
      } finally {
        setPendingBrokerAction(null);
      }
    },
    [fetchAll, pushNotice, t]
  );

  return (
    <main className="min-h-screen p-6 max-w-[1800px] mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("app.title")}</h1>
          <p className="text-sm text-zinc-400 mt-1">{t("app.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
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
              ? t("status.connected", {
                  count: aliveBrokers.length,
                  total: brokers.length,
                })
              : t("status.disconnected")}
          </span>
          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-300"
          >
            {t("status.kafkaUi")}
          </a>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          <strong>{t("error.connectionFailed")}</strong> {error}
          <div className="mt-1 text-xs text-red-400/80">
            {t("error.checkCluster")}
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
            maxBrokers={aliveBrokers.length || 6}
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
                message: t("calcProducer.noticePublished", {
                  topic: info.topic,
                  partition: info.partition,
                  offset: info.offset,
                }),
              });
              const nonce = Date.now();
              setJustPublishedPartition({
                topic: info.topic,
                partition: info.partition,
                nonce,
              });
              setTimeout(() => {
                setJustPublishedPartition((prev) =>
                  prev && prev.nonce === nonce ? null : prev
                );
              }, 2500);
            }}
            onError={(msg) =>
              pushNotice({
                type: "error",
                message: t("calcProducer.noticeFailed", { msg }),
              })
            }
          />
        </section>
        <section
          className="col-span-12 md:col-span-6 xl:col-span-3"
          style={matchedHeight}
        >
          <CalcResults />
        </section>

        <section className="col-span-12">
          <StatsPanel />
        </section>

        <section className="col-span-12">
          <BrokerGrid
            brokers={brokers}
            topics={topics}
            controller={controller}
            highlightedTopic={highlightedTopic}
            justCreatedTopic={justCreatedTopic}
            justPublishedPartition={
              justPublishedPartition
                ? {
                    topic: justPublishedPartition.topic,
                    partition: justPublishedPartition.partition,
                  }
                : null
            }
            onPartitionClick={(topic, partition) =>
              setViewer({ topic, partition })
            }
            topicColors={topicColors}
            onBrokerAction={brokerAction}
            pendingBrokerAction={pendingBrokerAction}
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

      <LoadingOverlay op={pendingOp} />

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
        {t("footer.hint")}
      </footer>
    </main>
  );
}
