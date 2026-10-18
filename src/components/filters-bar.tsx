"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";
import { useLang } from "@/lib/lang";

const STORAGE_KEY = "cinema-filters";

function saveQ(q: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (q) data.q = q; else delete data.q;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

interface FiltersBarProps {
  totalShown: number;
  totalAll: number;
}

export function FiltersBar({ totalShown, totalAll }: FiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep search in sync if URL changes externally
  const urlQ = searchParams.get("q") ?? "";
  const prevUrlQ = useRef(urlQ);
  useEffect(() => {
    if (prevUrlQ.current !== urlQ) {
      prevUrlQ.current = urlQ;
      setSearch(urlQ);
    }
  }, [urlQ]);

  function pushQ(q: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q); else params.delete("q");
    saveQ(q ?? "");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/?${qs}` : "/"));
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushQ(value || null), 300);
  }

  function clearSearch() {
    setSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushQ(null);
  }

  function clearAll() {
    setSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Clear everything from localStorage except preserve structure
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    // Tell GlobalFilterFab to reset its state. `reset` stops it from also
    // rewriting the URL (from the current one, which still has ?q=): two
    // navigations at once and the push home below gets dropped.
    window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT, { detail: { reset: true } }));
    startTransition(() => router.push("/"));
  }

  const isFiltered =
    search !== "" ||
    totalShown !== totalAll;

  return (
    // On phones this wrapper dissolves (`contents`) so its pieces join the
    // toolbar row: title + view toggle on line one, search full-width below.
    <div className="flex flex-1 min-w-0 items-center gap-4 max-sm:contents">
      {/* Title + result count */}
      <div className="min-w-0 mr-auto max-sm:order-1 max-sm:flex-1">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{t.home.allFilms}</h2>
        <p className="text-sm tabular-nums text-foreground/55 truncate">
          {isFiltered ? t.filters.ofFilms(totalShown, totalAll) : t.filters.filmsInCity(totalAll)}
          {isFiltered && (
            <button
              onClick={clearAll}
              className="ml-2 inline-flex items-center gap-0.5 font-medium text-roman-muted hover:text-roman transition-colors"
            >
              <X className="size-3" /> {t.filters.clearAll}
            </button>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-[18rem] max-sm:order-3 max-sm:max-w-none max-sm:basis-full">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-foreground/45" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t.filters.search}
          aria-label={t.filters.search}
          className="h-10 w-full rounded-full bg-foreground/[0.06] pl-10 pr-9 text-sm text-foreground placeholder:text-foreground/45 focus:outline-none focus:bg-background focus:ring-2 focus:ring-roman/40 transition"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-full text-roman-muted hover:bg-roman/10 active:bg-roman active:text-white transition"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
