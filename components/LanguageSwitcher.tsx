"use client";

import { LOCALES, type Locale } from "@/lib/i18n";
import { useT } from "./I18nProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useT();
  return (
    <div className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-full p-0.5">
      {LOCALES.map((l) => {
        const active = locale === l.code;
        return (
          <button
            key={l.code}
            onClick={() => setLocale(l.code as Locale)}
            className={`px-2.5 py-1 text-[11px] rounded-full transition ${
              active
                ? "bg-emerald-500 text-black font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {l.code === "en" ? "EN" : "KO"}
          </button>
        );
      })}
    </div>
  );
}
