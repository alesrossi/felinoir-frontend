"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, SlidersHorizontal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLang } from "@/lib/lang";
import { LangSwitcher } from "@/components/lang-switcher";
import { GLOBAL_FILTER_EVENT, GlobalFilterFab } from "@/components/global-filter-fab";
import { CinemasFab } from "@/components/cinemas-fab";
import { cn } from "@/lib/utils";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport";
import { TIME_RANGES } from "@/lib/time-ranges";
import type { ActiveFilters } from "@/app/api/felix/route";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const THINKING = "__thinking__";

const STORAGE_KEY = "cinema-filters";

function readFilters(cinemas: Cinema[]): ActiveFilters | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as Record<string, string>;

    const cinemaIds = stored.cinemas ? stored.cinemas.split(",").filter(Boolean) : [];
    const cinemaNames = cinemaIds
      .map((id) => cinemas.find((c) => c.id === id)?.name)
      .filter((n): n is string => !!n);

    const dates = stored.dates ? stored.dates.split(",").filter(Boolean) : [];

    const timeIds = stored.times ? stored.times.split(",").filter(Boolean) : [];
    const timeLabels = timeIds
      .map((id) => TIME_RANGES.find((r) => r.id === id)?.label)
      .filter((l): l is string => !!l);

    const genres = stored.genres ? stored.genres.split(",").filter(Boolean) : [];
    const ov = stored.ov === "true";
    const q = stored.q?.trim() || undefined;

    const filters: ActiveFilters = {
      ...(cinemaNames.length && { cinemas: cinemaNames }),
      ...(dates.length && { dates }),
      ...(timeLabels.length && { times: timeLabels }),
      ...(genres.length && { genres }),
      ...(ov && { ov }),
      ...(q && { q }),
    };

    return Object.keys(filters).length ? filters : undefined;
  } catch {
    return undefined;
  }
}

async function askFelix(messages: Message[], filters: ActiveFilters | undefined): Promise<string> {
  // Strip the UI greeting (leading assistant messages) — API conversation must start with user
  const firstUser = messages.findIndex((m) => m.role === "user");
  const toSend = messages
    .slice(firstUser >= 0 ? firstUser : 0)
    .filter((m) => m.content !== THINKING);

  const res = await fetch("/api/felix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: toSend, filters }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Errore sconosciuto");
  return data.reply as string;
}

function replaceThinking(prev: Message[], reply: string): Message[] {
  const idx = prev.findLastIndex((m) => m.content === THINKING);
  if (idx === -1) return prev;
  return prev.map((m, i) => (i === idx ? { ...m, content: reply } : m));
}

interface Cinema { id: string; name: string; openAir: boolean }

export function FelixChat({ cinemas }: { cinemas: Cinema[] }) {
  const { t } = useLang();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.felix.greeting },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters | undefined>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewport = useKeyboardViewport();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep the latest message in view as the keyboard opens/closes and the
  // visible region resizes underneath the chat.
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [viewport?.height]);

  // Lock the document so it can't scroll the fixed chat out from under the
  // keyboard; the message list does all the scrolling instead.
  useEffect(() => {
    const root = document.documentElement;
    const prevHtml = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  // Read active filters on mount and whenever they change
  useEffect(() => {
    const refresh = () => setFilters(readFilters(cinemas));
    refresh();
    window.addEventListener(GLOBAL_FILTER_EVENT, refresh);
    return () => window.removeEventListener(GLOBAL_FILTER_EVENT, refresh);
  }, [cinemas]);

  // Read initial query stored by the homepage AskFelix widget
  useEffect(() => {
    const q = sessionStorage.getItem("felix:initial");
    if (!q) return;
    sessionStorage.removeItem("felix:initial");

    const withQuery: Message[] = [
      { role: "assistant", content: t.felix.greeting },
      { role: "user", content: q },
      { role: "assistant", content: THINKING },
    ];
    setMessages(withQuery);
    setPending(true);

    askFelix(withQuery, readFilters(cinemas))
      .then((reply) => setMessages((prev) => replaceThinking(prev, reply)))
      .catch((err) =>
        setMessages((prev) =>
          replaceThinking(prev, err instanceof Error ? err.message : "Errore. Riprova."),
        ),
      )
      .finally(() => {
        setPending(false);
        inputRef.current?.focus();
      });
  // t.felix.greeting is stable for the lifetime of this mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send() {
    const q = input.trim();
    if (!q || pending) return;
    setInput("");
    setPending(true);

    const next: Message[] = [
      ...messages,
      { role: "user", content: q },
      { role: "assistant", content: THINKING },
    ];
    setMessages(next);

    askFelix(next, filters)
      .then((reply) => setMessages((prev) => replaceThinking(prev, reply)))
      .catch((err) =>
        setMessages((prev) =>
          replaceThinking(prev, err instanceof Error ? err.message : "Errore. Riprova."),
        ),
      )
      .finally(() => {
        setPending(false);
        inputRef.current?.focus();
      });
  }

  return (
    <>
    <div
      className="fixed inset-x-0 top-0 flex h-dvh flex-col overflow-hidden bg-background text-foreground"
      style={
        viewport
          ? { height: viewport.height, transform: `translateY(${viewport.offsetTop}px)` }
          : undefined
      }
    >
      {/* Header */}
      <header className="shrink-0 border-b border-border px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t.felix.backToHome}
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[hsl(var(--roman))] flex items-center justify-center text-xs font-bold text-white select-none">
              F
            </span>
            <span className="font-serif italic text-base sm:text-lg leading-none">Felix</span>
          </div>
        </div>
        <LangSwitcher />
      </header>

      {/* Message list */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 sm:py-6 space-y-3 sm:space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 sm:gap-3 w-full",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 mt-0.5 rounded-full bg-[hsl(var(--roman))] flex items-center justify-center text-xs font-bold text-white select-none">
                F
              </div>
            )}
            <div
              className={cn(
                "rounded-sm px-3 py-2 sm:px-4 sm:py-2.5 text-sm leading-relaxed",
                "max-w-[88vw] sm:max-w-xl",
                msg.role === "user" && "whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-[hsl(var(--roman))] text-white"
                  : "bg-card text-card-foreground border border-border",
                msg.content === THINKING && "italic text-muted-foreground",
              )}
            >
              {msg.content === THINKING ? (
                <ThinkingDots />
              ) : msg.role === "assistant" ? (
                <MarkdownContent content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="shrink-0 border-t border-border px-2 py-2 sm:px-4 sm:py-3 flex items-center gap-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* Filter toggle — pops the original global-filter drawer up/down */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-label={t.filters.title}
          aria-expanded={filtersOpen}
          className={cn(
            "relative shrink-0 flex items-center justify-center size-9 sm:size-12 rounded-full",
            "bg-card border shadow-lg transition-colors duration-200",
            filtersOpen
              ? "border-roman-muted text-roman-muted"
              : "border-roman/40 text-roman hover:text-roman-muted hover:border-roman-muted",
          )}
        >
          <SlidersHorizontal className="size-4 sm:size-5" />
          {filters && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-roman" />
          )}
        </button>
        <div className="shrink-0 scale-75 sm:scale-100 origin-center -mx-1.5 sm:mx-0">
          <CinemasFab />
        </div>
        <div
          className={cn(
            "flex flex-1 items-center gap-2 rounded-sm border border-border bg-card px-3 py-2",
            "focus-within:border-[hsl(var(--roman-muted))] transition-colors duration-150",
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t.felix.inputPlaceholder}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || pending}
            className={cn(
              "shrink-0 p-1 rounded-sm transition-colors",
              input.trim() && !pending
                ? "text-[hsl(var(--roman-muted))] hover:text-[hsl(var(--roman))]"
                : "text-muted-foreground cursor-default",
            )}
            aria-label={t.felix.send}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>

    {/* Filter drawer — rendered outside the transformed container so its
        fixed positioning is viewport-relative and never clipped. */}
    <GlobalFilterFab
      cinemas={cinemas}
      open={filtersOpen}
      onOpenChange={setFiltersOpen}
      hideTrigger
    />
    </>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em:     ({ children }) => <em className="italic">{children}</em>,
        ul:     ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
        ol:     ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
        li:     ({ children }) => <li>{children}</li>,
        h3:     ({ children }) => <h3 className="mb-1 font-semibold text-foreground">{children}</h3>,
        code:   ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>,
        a:      ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--roman-muted))] underline underline-offset-2 hover:text-[hsl(var(--roman))]">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="animate-bounce [animation-delay:0ms] w-1 h-1 rounded-full bg-muted-foreground inline-block" />
      <span className="animate-bounce [animation-delay:150ms] w-1 h-1 rounded-full bg-muted-foreground inline-block" />
      <span className="animate-bounce [animation-delay:300ms] w-1 h-1 rounded-full bg-muted-foreground inline-block" />
    </span>
  );
}
