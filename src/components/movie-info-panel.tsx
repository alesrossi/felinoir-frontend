"use client";

import React, { useState, useEffect } from "react";
import { useLang } from "@/lib/lang";
import { toEnGenre } from "@/lib/genres";
import { loadStoredGenres, toggleStoredGenre, GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";
import { PosterImage } from "@/components/ui/poster-image";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { languageToFlag } from "@/lib/utils";

function buildBackHref(base: string): string {
  try {
    const raw = localStorage.getItem("cinema-filters");
    const data: Record<string, string> = raw ? JSON.parse(raw) : {};
    const params = new URLSearchParams();
    for (const key of ["q", "cinemas", "dates", "times", "genres", "sort", "ov"] as const) {
      if (data[key]) params.set(key, data[key]);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  } catch {
    return base;
  }
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

export interface MovieInfoData {
  title: string;
  originalTitle?: string;
  released?: string;
  director?: string;
  actors?: string;
  durationMinutes?: number;
  scrapedGenres: string[];  // scraped fallback
  tmdbRating?: string;
  imdbRating?: string;
  rtRating?: string;
  metacriticScore?: string;
  tmdbLanguage?: string;
  tmdbCountry?: string;
  // bilingual fields
  tmdbTitle?: string;
  tmdbTitleEn?: string;
  tmdbPlot?: string;
  tmdbPlotEn?: string;
  tmdbGenre?: string;
  tmdbGenreEn?: string;
  synopsis?: string;
  tmdbPosterUrl?: string;
  posterUrl?: string;
  tmdbTrailerUrlIt?: string;
  tmdbTrailerUrlEn?: string;
}

interface MovieInfoPanelProps {
  movie: MovieInfoData;
  markersCount: number;
  backHref: string;
  hasOV?: boolean;
  hasNonOV?: boolean;
  viewToggle?: React.ReactNode;
}

export function MovieInfoPanel({ movie, markersCount, backHref, hasOV, hasNonOV, viewToggle }: MovieInfoPanelProps) {
  const { t, locale } = useLang();
  const router = useRouter();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveGenres(loadStoredGenres());
    function onFilter() { setActiveGenres(loadStoredGenres()); }
    window.addEventListener(GLOBAL_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(GLOBAL_FILTER_EVENT, onFilter);
  }, []);

  const displayTitle =
    locale === "en"
      ? (movie.tmdbTitleEn ?? movie.tmdbTitle ?? movie.title)
      : (movie.tmdbTitle ?? movie.title);

  const plot =
    locale === "en"
      ? (movie.tmdbPlotEn ?? movie.tmdbPlot ?? movie.synopsis)
      : (movie.tmdbPlot ?? movie.synopsis ?? movie.tmdbPlotEn);

  const genreString = locale === "en"
    ? (movie.tmdbGenreEn ?? movie.tmdbGenre)
    : (movie.tmdbGenre ?? movie.tmdbGenreEn);
  const genres = genreString
    ? genreString.split(",").map((g) => g.trim()).filter(Boolean)
    : movie.scrapedGenres;

  const actorList = movie.actors?.split(",").map((a) => a.trim()).filter(Boolean) ?? [];
  const actorsDisplay =
    actorList.length > 3 ? actorList.slice(0, 3).join(", ") + "…" : actorList.join(", ");

  const trailerUrl =
    locale === "en"
      ? (movie.tmdbTrailerUrlEn ?? movie.tmdbTrailerUrlIt)
      : (movie.tmdbTrailerUrlIt ?? movie.tmdbTrailerUrlEn);
  const trailerId = trailerUrl ? extractYoutubeId(trailerUrl) : null;

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border shrink-0">
        <button
          onClick={() => router.push(buildBackHref(backHref))}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-roman-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t.movie.back}
        </button>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <LangSwitcher />
        </div>
      </div>

      {/* Details */}
      <div className="p-6 lg:p-8 space-y-7">

        {/* Hero: poster + title */}
        <div className="flex gap-6">
          <div className="shrink-0">
            <PosterImage
              primary={movie.tmdbPosterUrl}
              fallback={movie.posterUrl}
              alt={`${displayTitle} poster`}
              className="w-28 sm:w-36 rounded border border-white/10 object-cover aspect-[2/3] shadow-2xl"
              placeholderClassName="w-28 sm:w-36 aspect-[2/3] rounded border border-white/10 bg-muted"
              priority
            />
          </div>

          <div className="min-w-0 space-y-4 pt-1">
            <div>
              <h1 className="font-serif italic text-2xl lg:text-3xl font-light leading-snug text-foreground">
                {displayTitle}
              </h1>
              {movie.originalTitle && movie.originalTitle !== displayTitle && (
                <p className="text-sm text-foreground/60 italic mt-1">{movie.originalTitle}</p>
              )}
              <p className="text-xs text-foreground mt-1.5 font-mono tracking-wider">
                {movie.released?.slice(0, 4) ?? "N/A"}
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[10px] font-mono tracking-widest uppercase text-foreground/55 shrink-0 w-7">
                  {t.movie.director}
                </span>
                <span className="text-sm text-foreground/80">{movie.director ?? "N/A"}</span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-[10px] font-mono tracking-widest uppercase text-foreground/55 shrink-0 w-7">
                  {t.movie.cast}
                </span>
                <span
                  className="text-sm text-foreground/80 leading-snug cursor-default"
                  title={actorList.length > 3 ? actorList.join(", ") : undefined}
                >
                  {actorsDisplay || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono tracking-widest uppercase text-foreground/55 shrink-0 w-7">
                  {t.movie.runtime}
                </span>
                <span className="text-sm text-foreground/80">
                  {movie.durationMinutes ? `${movie.durationMinutes} min` : "N/A"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {genres.length > 0 ? genres.map((g) => {
                const isActive = activeGenres.size > 0 && activeGenres.has(toEnGenre(g) ?? "");
                return (
                  <button
                    key={g}
                    onClick={() => { toggleStoredGenre(toEnGenre(g) ?? ""); router.push(buildBackHref("/")); }}
                    className={[
                      "text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors",
                      isActive
                        ? "border-roman text-roman bg-roman/10"
                        : "border-border text-muted-foreground hover:border-roman/50 hover:text-foreground",
                    ].join(" ")}
                  >
                    {g}
                  </button>
                );
              }) : (
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-sm border border-white/15 text-foreground/55">
                  N/A
                </span>
              )}
            </div>

            {trailerId && (
              <button
                onClick={() => setTrailerOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-roman-muted hover:text-roman transition-colors"
              >
                <span className="font-mono tracking-wider uppercase">{t.movie.watchTrailer}</span>
                <span className="text-lg leading-none">▶</span>
              </button>
            )}
          </div>
        </div>

        {/* Ratings */}
        <div className="h-px bg-border" />
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:flex sm:items-end sm:gap-5 sm:flex-wrap">
          {[
            { label: "TMDb",           title: "The Movie Database",       value: movie.tmdbRating,      suffix: "/10"  },
            { label: "Rotten Tomatoes", title: "Rotten Tomatoes",         value: movie.rtRating,        suffix: undefined },
            { label: "IMDb",           title: "Internet Movie Database",  value: movie.imdbRating,      suffix: "/10"  },
            { label: "Metacritic",     title: "Metacritic",               value: movie.metacriticScore, suffix: "/100" },
          ].map(({ label, title, value, suffix }) => (
            <div key={label}>
              <p title={title} className="text-[10px] font-mono tracking-widest uppercase text-foreground/55 mb-1 cursor-help">{label}</p>
              <p className="text-2xl font-semibold tabular-nums text-foreground leading-none">
                {value
                  ? <>{value}{suffix && <span className="text-sm font-normal text-foreground/55">{suffix}</span>}</>
                  : <span className="text-foreground/55 text-lg">—</span>}
              </p>
            </div>
          ))}
          <div className="ml-auto flex flex-col items-end gap-0.5 text-xl leading-none">
            {(() => {
              const isItalian = movie.tmdbLanguage === "it";
              const showIT = hasNonOV || isItalian;
              const showOV = hasOV && !isItalian;
              if (!showIT && !showOV) return <span className="text-sm text-foreground/55">N/A</span>;
              return <>
                {showIT && <span title="Italiano">🇮🇹</span>}
                {showOV && movie.tmdbLanguage && (
                  <span title={movie.tmdbLanguage.toUpperCase()}>{languageToFlag(movie.tmdbLanguage)}</span>
                )}
              </>;
            })()}
          </div>
        </div>

        {/* Plot */}
        <div className="h-px bg-border" />
        <p className="text-sm text-foreground/70 leading-relaxed">
          {plot ?? <span className="italic text-foreground/50">N/A</span>}
        </p>

        {/* Where to watch */}
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-mono tracking-[0.2em] uppercase text-foreground/55">
            {t.movie.whereToWatch}
          </h2>
          <div className="flex items-center gap-2">
            {markersCount > 0 && (
              <p className="text-xs text-foreground/50 tabular-nums">
                {t.movie.cinemas(markersCount)}
              </p>
            )}
            {viewToggle}
          </div>
        </div>

      </div>

      {/* Trailer modal */}
      {trailerOpen && trailerId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setTrailerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80" />
          <div
            className="relative z-10 w-full max-w-3xl aspect-video rounded overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-sm bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1`}
              title="Trailer"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
