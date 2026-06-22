"use client";

import Link from "next/link";
import { ChevronRight, Star, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { mapsUrl } from "@/lib/utils";
import { GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";
import { useLang } from "@/lib/lang";

const STORAGE_KEY = "cinema-filters";

function readStarred(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return new Set((data.cinemas ?? "").split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

function writeStarred(ids: Set<string>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (ids.size > 0) data.cinemas = [...ids].join(",");
    else delete data.cinemas;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT));
  } catch {}
}

interface Cinema {
  id: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

export function CinemasListContent({ cinemas }: { cinemas: Cinema[] }) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStarred(readStarred());

    function sync() { setStarred(readStarred()); }
    window.addEventListener(GLOBAL_FILTER_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(GLOBAL_FILTER_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggle(id: string) {
    const next = new Set(starred);
    if (next.has(id)) next.delete(id); else next.add(id);
    writeStarred(next);
    setStarred(next);
  }

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? cinemas.filter(c => c.name.toLowerCase().includes(needle))
    : cinemas;

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.filters.searchCinema}
          aria-label={t.filters.searchCinema}
          className="w-full bg-card border border-border rounded-sm pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border/80"
        />
      </div>
      <ul className="divide-y divide-border">
      {visible.map((cinema) => {
        const isStarred = starred.has(cinema.id);
        return (
          <li key={cinema.id} className="flex items-center gap-3 group">
            <button
              onClick={() => toggle(cinema.id)}
              aria-label={isStarred ? "Remove from filter" : "Add to filter"}
              className="shrink-0 p-1 transition-colors"
            >
              <Star
                className={[
                  "size-4 transition-colors",
                  isStarred
                    ? "fill-roman text-roman hover:text-roman-muted"
                    : "text-roman hover:text-roman-muted",
                ].join(" ")}
              />
            </button>

            <div className="flex flex-1 items-center justify-between gap-4 py-4 min-w-0">
              <div className="min-w-0">
                <Link href={`/cinemas/${cinema.id}`} className="block">
                  <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                    {cinema.name}
                  </p>
                </Link>
                {cinema.address && (
                  <a
                    href={mapsUrl(cinema.address, cinema.coordinates)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground mt-0.5 truncate hover:text-roman-muted transition-colors block"
                  >
                    {cinema.address}
                  </a>
                )}
              </div>
              <Link href={`/cinemas/${cinema.id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-roman-muted transition-colors" />
              </Link>
            </div>
          </li>
        );
      })}
      </ul>
    </>
  );
}
