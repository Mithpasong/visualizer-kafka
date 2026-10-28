"use client";

import { useCallback, useEffect, useState } from "react";

interface PartitionMessageItem {
  partition: number;
  offset: string;
  key: string;
  value: any;
  rawValue: string;
  consumedAt: string;
}

interface Props {
  topic: string;
  partition: number;
  onClose: () => void;
}

export default function PartitionViewer({ topic, partition, onClose }: Props) {
  const [messages, setMessages] = useState<PartitionMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/calc/partition?topic=${encodeURIComponent(
          topic
        )}&partition=${partition}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [topic, partition]);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 1500);
    return () => clearInterval(id);
  }, [fetchMessages]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-slide-in"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Topic{" "}
              <span className="font-mono text-orange-300">{topic}</span> /
              Partition{" "}
              <span className="font-mono text-orange-300">{partition}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              이 파티션에 저장된 메시지 ({messages.length}건)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl leading-none px-2"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="text-xs text-zinc-500 text-center py-10">
              로딩 중...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {error}
            </div>
          )}
          {!loading && messages.length === 0 && !error && (
            <div className="text-xs text-zinc-600 italic text-center py-10 border border-dashed border-zinc-800 rounded-lg">
              이 파티션에 저장된 메시지가 없습니다.
              <br />
              (서버 시작 후 이 토픽으로 발행된 메시지만 표시됩니다)
            </div>
          )}
          {messages.map((m) => (
            <div
              key={`${m.partition}-${m.offset}`}
              className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3"
            >
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5 font-mono">
                <span>
                  offset{" "}
                  <span className="text-orange-300 font-bold">{m.offset}</span>
                  {m.key ? ` · key=${m.key}` : " · (no key)"}
                </span>
                <span>{new Date(m.consumedAt).toLocaleTimeString()}</span>
              </div>
              <pre className="text-xs text-zinc-200 font-mono bg-zinc-950 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {typeof m.value === "object"
                  ? JSON.stringify(m.value, null, 2)
                  : m.rawValue}
              </pre>
            </div>
          ))}
        </div>

        <footer className="p-3 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
          1.5초마다 자동 새로고침 · ESC 또는 바깥 클릭으로 닫기
        </footer>
      </div>
    </div>
  );
}
