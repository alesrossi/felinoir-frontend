"use client";

import { useLang } from "@/lib/lang";
import type { Locale } from "@/lib/translations";

export function LangSwitcher() {
  const { locale, setLocale } = useLang();

  const labels: Record<Locale, string> = { it: "Passa all'italiano", en: "Switch to English" };

  function btn(l: Locale) {
    const active = locale === l;
    return (
      <button
        key={l}
        onClick={() => setLocale(l)}
        aria-label={labels[l]}
        aria-pressed={active}
        className={`px-1.5 py-0.5 font-mono text-xs tracking-widest uppercase transition-colors ${
          active
            ? "text-foreground"
            : "text-foreground/30 hover:text-foreground/60"
        }`}
      >
        {l}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {btn("it")}
      <span className="text-foreground/20 text-xs select-none">|</span>
      {btn("en")}
    </div>
  );
}
