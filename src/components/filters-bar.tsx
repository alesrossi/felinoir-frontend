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
    // Clear q from URL and all filter params
    startTransition(() => router.push("/"));
    // Clear everything from localStorage except preserve structure
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    // Tell GlobalFilterFab to reset its state
    window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT));
  }

  const isFiltered =
    search !== "" ||
    totalShown !== totalAll;

  return (
    <>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t.filters.search}
          aria-label={t.filters.search}
          className="w-full rounded-sm border border-border bg-card pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-roman/60 focus:border-roman/50 transition-colors"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-muted-foreground">
          {isFiltered ? (
            <span className="text-foreground font-medium">{t.filters.ofFilms(totalShown, totalAll)}</span>
          ) : (
            <span className="text-foreground font-medium">{t.filters.filmsInCity(totalAll)}</span>
          )}
        </p>
        {isFiltered && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="size-3" /> {t.filters.clearAll}
          </button>
        )}
      </div>
    </>
  );
}
