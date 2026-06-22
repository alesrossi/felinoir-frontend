"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useLang } from "@/lib/lang";
import { cn } from "@/lib/utils";

export function AskFelix() {
  const { t } = useLang();
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const q = value.trim();
    if (!q) return;
    sessionStorage.setItem("felix:initial", q);
    router.push("/felix");
  }

  return (
    <div className="mt-6 mb-2">
      <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-2 select-none">
        {t.felix.label}
      </p>
      <div
        className={cn(
          "flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2",
          "focus-within:border-[hsl(var(--roman-muted))] transition-colors duration-150",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t.felix.placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className={cn(
            "shrink-0 p-1 rounded-sm transition-colors",
            value.trim()
              ? "text-[hsl(var(--roman-muted))] hover:text-[hsl(var(--roman))]"
              : "text-muted-foreground cursor-default",
          )}
          aria-label={t.felix.send}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
