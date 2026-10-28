"use client";

import { useT } from "./I18nProvider";

interface Props {
  op: { kind: "create" | "delete"; name: string } | null;
}

export default function LoadingOverlay({ op }: Props) {
  const { t } = useT();
  if (!op) return null;

  const title =
    op.kind === "create"
      ? t("overlay.creating", { name: op.name })
      : t("overlay.deleting", { name: op.name });

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center animate-slide-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[320px]">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-700" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-400 animate-spin" />
        </div>
        <div className="text-white text-sm font-semibold text-center">
          {title}
        </div>
        <div className="text-xs text-zinc-400 text-center">
          {t("overlay.pleaseWait")}
        </div>
      </div>
    </div>
  );
}
