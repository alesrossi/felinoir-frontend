"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { toEnGenre } from "@/lib/genres";
import { loadStoredGenres, toggleStoredGenre, GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";
import { Card, CardContent } from "@/components/ui/card";
import { PosterImage } from "@/components/ui/poster-image";
import { useLang } from "@/lib/lang";
import { languageToFlag } from "@/lib/utils";
import type { ApiMovie as MovieRecord } from "@/lib/api/types";

interface MovieCardProps {
  movie: MovieRecord;
  screeningCount?: number;
  filterParams?: string;
  view?: "grid" | "list";
  hasOV?: boolean;
  hasNonOV?: boolean;
  priority?: boolean;
}

function PlotModal({ title, plot, onClose }: { title: string; plot: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
          <p className="font-semibold text-foreground leading-snug">{title}</p>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed overflow-y-auto min-h-0">{plot}</p>
      </div>
    </div>
  );
}

export function MovieCard({ movie, screeningCount, filterParams, view = "grid", hasOV, hasNonOV, priority }: MovieCardProps) {
  const { locale } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [plotOpen, setPlotOpen] = useState(false);
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveGenres(loadStoredGenres());
    function onFilter() { setActiveGenres(loadStoredGenres()); }
    window.addEventListener(GLOBAL_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(GLOBAL_FILTER_EVENT, onFilter);
  }, []);
  const moviePath = movie.slug ?? movie.id;
  const href = filterParams ? `/movies/${moviePath}?${filterParams}` : `/movies/${moviePath}`;

  const displayTitle = locale === "en"
    ? (movie.tmdbTitleEn ?? movie.tmdbTitle ?? movie.title)
    : (movie.tmdbTitle ?? movie.title);

  const plot = locale === "en"
    ? (movie.tmdbPlotEn ?? movie.tmdbPlot)
    : (movie.tmdbPlot ?? movie.tmdbPlotEn);

  const genres = ((locale === "en" ? movie.tmdbGenreEn : movie.tmdbGenre) ?? "")
    .split(",").map(g => g.trim()).filter(Boolean).slice(0, 4);

  const isItalian = movie.tmdbLanguage === "it";
  const showIT    = hasNonOV || isItalian;
  const showOV    = hasOV && !isItalian;

  function handleGenreClick(e: React.MouseEvent, displayGenre: string) {
    e.preventDefault();
    const enKey = toEnGenre(displayGenre);
    if (!enKey) return;
    toggleStoredGenre(enKey, (updated) => {
      if (pathname !== "/") return;
      const url = new URL(window.location.href);
      if (updated.size > 0) url.searchParams.set("genres", [...updated].join(","));
      else url.searchParams.delete("genres");
      router.replace(url.pathname + url.search);
    });
  }

  if (view === "list") {
    return (
      <>
        <div className="flex flex-row rounded-lg border border-border bg-card overflow-hidden hover:border-roman/40 transition-colors duration-200">
          {/* Poster — links to film */}
          <Link href={href} className="w-[72px] sm:w-28 shrink-0 overflow-hidden group">
            <PosterImage
              primary={movie.tmdbPosterUrl}
              fallback={movie.posterUrl}
              alt={`${displayTitle} poster`}
              className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-105 group-hover:brightness-90"
              placeholderClassName="w-full aspect-[2/3]"
              priority={priority}
            />
          </Link>

          {/* Info */}
          <div className="flex-1 min-w-0 p-2.5 sm:p-3 flex flex-col gap-1 overflow-hidden">
            {/* Title + flags — links to film */}
            <Link href={href} className="group flex items-start gap-1">
              <p className="flex-1 min-w-0 text-sm font-semibold leading-snug text-foreground group-hover:text-roman-muted transition-colors line-clamp-2">
                {displayTitle}
              </p>
              {(showIT || showOV) && (
                <div className="flex items-center gap-0.5 shrink-0 text-sm leading-none mt-0.5">
                  {showIT && <span title="Italiano">🇮🇹</span>}
                  {showOV && movie.tmdbLanguage && (
                    <span title={movie.tmdbLanguage.toUpperCase()}>{languageToFlag(movie.tmdbLanguage)}</span>
                  )}
                </div>
              )}
            </Link>

            {/* Genre tags */}
            <div className="flex items-center gap-1 flex-wrap overflow-hidden">
              {genres.map(g => {
                const isActive = activeGenres.size > 0 && activeGenres.has(toEnGenre(g) ?? "");
                return (
                  <button
                    key={g}
                    onClick={(e) => handleGenreClick(e, g)}
                    className={[
                      "text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded truncate max-w-[80px] border transition-colors",
                      isActive
                        ? "border-roman text-roman"
                        : "text-muted-foreground bg-muted/40 border-border hover:border-roman/50 hover:text-foreground",
                    ].join(" ")}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {/* Plot — opens modal, does NOT navigate */}
            {plot && (
              <button
                onClick={() => setPlotOpen(true)}
                className="text-left mt-0.5 group/plot focus:outline-none"
              >
                <p className="text-[11px] sm:text-xs leading-snug text-muted-foreground line-clamp-3 group-hover/plot:text-foreground/80 transition-colors">
                  {plot}
                </p>
              </button>
            )}
          </div>
        </div>

        {plotOpen && plot && (
          <PlotModal title={displayTitle} plot={plot} onClose={() => setPlotOpen(false)} />
        )}
      </>
    );
  }

  // Grid view — standard poster card
  return (
    <Link href={href} className="group block focus:outline-none">
      <Card className="h-full overflow-hidden transition-colors duration-200 group-hover:border-roman/40 group-focus-visible:border-roman/60">
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-card">
          <PosterImage
            primary={movie.tmdbPosterUrl}
            fallback={movie.posterUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 group-hover:brightness-90"
            placeholderClassName="h-full w-full"
            priority={priority}
          />
        </div>
        <CardContent className="p-3 space-y-1">
          <div className="flex items-start gap-1">
            <p className="flex-1 min-w-0 text-sm font-medium leading-snug text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2">
              {displayTitle}
            </p>
            {(showIT || showOV) && (
              <div className="flex items-center gap-0.5 shrink-0 text-sm leading-none mt-0.5">
                {showIT && <span title="Italiano">🇮🇹</span>}
                {showOV && movie.tmdbLanguage && (
                  <span title={movie.tmdbLanguage.toUpperCase()}>{languageToFlag(movie.tmdbLanguage)}</span>
                )}
              </div>
            )}
          </div>
          {movie.originalTitle && movie.originalTitle !== displayTitle && (
            <p className="text-xs text-muted-foreground italic line-clamp-1">
              {movie.originalTitle}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
