"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { toEnGenre } from "@/lib/genres";
import { loadStoredGenres, toggleStoredGenre, GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";
import { PosterImage } from "@/components/ui/poster-image";
import { useLang } from "@/lib/lang";
import { languageToFlag } from "@/lib/utils";
import { moviePath } from "@/lib/structured-data/constants";
import type { HomeMovie as MovieRecord } from "@/lib/api/types";

interface MovieCardProps {
  movie: MovieRecord;
  screeningCount?: number;
  filterParams?: string;
  view?: "grid" | "list";
  hasOV?: boolean;
  hasNonOV?: boolean;
  priority?: boolean;
}

function formatRuntime(minutes?: number): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

function PlotModal({ title, plot, onClose }: { title: string; plot: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl bg-popover ring-1 ring-foreground/10 shadow-2xl p-6 flex flex-col max-h-[80vh] animate-in fade-in-0 zoom-in-95 duration-200 ease-out"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
          <p className="font-serif text-lg font-medium leading-tight tracking-[-0.01em] text-foreground">{title}</p>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <p className="text-sm text-foreground/75 leading-relaxed overflow-y-auto min-h-0">{plot}</p>
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
  const path = moviePath(movie);
  const href = filterParams ? `${path}?${filterParams}` : path;

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

  const year = movie.released?.slice(0, 4);
  const runtime = formatRuntime(movie.durationMinutes);
  const meta = [year, runtime, genres[0]].filter(Boolean).join(" · ");
  const rating = movie.imdbRating ?? movie.tmdbRating;

  const flags = (showIT || showOV) && (
    <>
      {showIT && <span title="Italiano">🇮🇹</span>}
      {showOV && movie.tmdbLanguage && (
        <span title={movie.tmdbLanguage.toUpperCase()}>{languageToFlag(movie.tmdbLanguage)}</span>
      )}
    </>
  );

  if (view === "list") {
    return (
      <>
        <div className="group flex flex-row gap-4 rounded-xl p-2 hover:bg-foreground/[0.04] transition-colors">
          {/* Poster — links to film */}
          <Link href={href} className="relative w-[72px] sm:w-24 shrink-0 self-start overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.5)]">
            <PosterImage
              primary={movie.tmdbPosterUrl}
              fallback={movie.posterUrl}
              alt={`${displayTitle} poster`}
              className="w-full aspect-[2/3] object-cover"
              placeholderClassName="w-full aspect-[2/3] bg-foreground/[0.06]"
              priority={priority}
            />
          </Link>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1 flex flex-col gap-1.5">
            <Link href={href} className="group/title flex items-start gap-2">
              <p className="flex-1 min-w-0 text-[15px] font-semibold leading-snug tracking-[-0.005em] text-foreground group-hover/title:text-roman-muted transition-colors line-clamp-2">
                {displayTitle}
              </p>
              {flags && <span className="flex items-center gap-0.5 shrink-0 text-sm leading-none mt-0.5">{flags}</span>}
            </Link>

            <p className="text-xs tabular-nums text-foreground/55">
              {[year, runtime].filter(Boolean).join(" · ")}
              {rating && (
                <span className="ml-2 inline-flex items-center gap-0.5 font-semibold text-foreground/75">
                  <Star className="size-3 fill-amber-400 text-amber-400" />{rating}
                </span>
              )}
            </p>

            {/* Genre tags */}
            {genres.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {genres.map(g => {
                  const isActive = activeGenres.size > 0 && activeGenres.has(toEnGenre(g) ?? "");
                  return (
                    <button
                      key={g}
                      onClick={(e) => handleGenreClick(e, g)}
                      className={[
                        "rounded-full px-2 py-0.5 text-[11px] transition active:scale-[0.96]",
                        isActive ? "btn-roman-on" : "btn-roman",
                      ].join(" ")}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Plot — opens modal, does NOT navigate */}
            {plot && (
              <button
                onClick={() => setPlotOpen(true)}
                className="text-left group/plot focus:outline-none"
              >
                <p className="text-xs leading-relaxed text-foreground/60 line-clamp-2 group-hover/plot:text-foreground/85 transition-colors">
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

  // Grid view — poster card: rating + languages float on the poster as glass
  // chips, the plot rises over the poster on hover.
  return (
    <Link href={href} className="group block focus:outline-none">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-foreground/[0.06] ring-1 ring-black/5 dark:ring-white/10 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.55)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_22px_40px_-18px_rgba(0,0,0,0.6)] group-active:scale-[0.98] group-focus-visible:ring-2 group-focus-visible:ring-roman motion-reduce:transform-none">
        <PosterImage
          primary={movie.tmdbPosterUrl}
          fallback={movie.posterUrl}
          alt=""
          className="h-full w-full object-cover"
          placeholderClassName="h-full w-full"
          priority={priority}
        />

        {rating && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold tabular-nums text-white backdrop-blur-md">
            <Star className="size-2.5 sm:size-3 fill-amber-400 text-amber-400" />
            {rating}
          </span>
        )}
        {flags && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[11px] leading-none backdrop-blur-md">
            {flags}
          </span>
        )}

        {plot && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden sm:block bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-12 opacity-0 translate-y-2 transition duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 motion-reduce:translate-y-0">
            <p className="text-xs leading-relaxed text-white/90 line-clamp-5">{plot}</p>
          </div>
        )}
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="text-xs sm:text-[15px] font-semibold leading-snug tracking-[-0.005em] text-foreground line-clamp-2 group-hover:text-roman-muted transition-colors">
          {displayTitle}
        </p>
        {meta && <p className="mt-0.5 hidden sm:block text-xs tabular-nums text-foreground/55 truncate">{meta}</p>}
      </div>
    </Link>
  );
}
