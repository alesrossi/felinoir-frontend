"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useLang } from "@/lib/lang";
import { moviePath } from "@/lib/structured-data/constants";
import { pickBackdropUrl } from "@/lib/tmdb-images";
import type { ApiMovie as MovieRecord } from "@/lib/api/types";

export type CarouselSectionId =
  | "tonight"
  | "lastChance"
  | "newArrivals"
  | "openingSoon"
  | "mostScreened"
  | "criticallyAcclaimed";

export interface CarouselSection {
  id: CarouselSectionId;
  movies: MovieRecord[];
}

// ---------------------------------------------------------------------------
// Card — a wide film still with the title laid over it. Deliberately unlike
// the poster grid below, so the highlights read as a showcase, not the list.
// ---------------------------------------------------------------------------

function HighlightCard({ movie, locale, priority }: { movie: MovieRecord; locale: string; priority?: boolean }) {
  const title = locale === "en" ? (movie.tmdbTitleEn ?? movie.title) : (movie.tmdbTitle ?? movie.title);
  const backdrop = pickBackdropUrl(movie.tmdbBackdrops, "w780");
  const poster = movie.tmdbPosterUrl ?? movie.posterUrl;
  const [failed, setFailed] = useState(false);

  const genre = ((locale === "en" ? movie.tmdbGenreEn : movie.tmdbGenre) ?? "").split(",")[0]?.trim();
  const meta = [movie.released?.slice(0, 4), genre].filter(Boolean).join(" · ");
  const rating = movie.imdbRating ?? movie.tmdbRating;

  const imgProps = {
    loading: priority ? "eager" : "lazy",
    decoding: "async",
    onError: () => setFailed(true),
  } as const;

  return (
    <Link
      href={moviePath(movie)}
      className="group relative flex-none w-[280px] xl:w-[320px] aspect-video snap-start overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.55)] active:scale-[0.98] transition-transform"
    >
      {backdrop && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backdrop} alt="" {...imgProps} className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none" />
      ) : poster ? (
        // No still: the poster, blurred into a backdrop, with the poster itself inset.
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" aria-hidden {...imgProps} className="absolute inset-0 size-full scale-125 object-cover blur-2xl opacity-70" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" {...imgProps} className="absolute right-3 top-3 bottom-3 aspect-[2/3] rounded-md object-cover shadow-xl ring-1 ring-white/10" />
        </>
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {rating && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-md">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          {rating}
        </span>
      )}

      <div className={`absolute bottom-0 left-0 p-4 ${backdrop && !failed ? "right-0" : "right-[38%]"}`}>
        <p className="font-serif text-xl font-medium leading-[1.15] tracking-[-0.01em] text-white line-clamp-2 [text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">
          {title}
        </p>
        {meta && <p className="mt-1 text-xs font-medium text-white/75 tabular-nums">{meta}</p>}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Highlights — one row, sections as tabs
// ---------------------------------------------------------------------------

interface HomeCarouselsProps {
  sections: CarouselSection[];
}

export function HomeCarousels({ sections }: HomeCarouselsProps) {
  const { locale, t } = useLang();
  const visible = sections.filter((s) => s.movies.length > 0);
  // Open on "Most screened" — the broadest pick — falling back to the first
  // section that has films.
  const [activeId, setActiveId] = useState<CarouselSectionId | undefined>(
    visible.some((s) => s.id === "mostScreened") ? "mostScreened" : visible[0]?.id,
  );
  const active = visible.find((s) => s.id === activeId) ?? visible[0];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateArrows); ro.disconnect(); };
  }, [updateArrows, active?.id]);

  function selectTab(id: CarouselSectionId) {
    setActiveId(id);
    scrollRef.current?.scrollTo({ left: 0 });
  }

  function scrollByPage(dir: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  }

  if (!active) return null;

  const arrowClass =
    // Floats over imagery, so the outline sits on a solid backing for contrast.
    "btn-roman absolute top-1/2 z-10 -translate-y-1/2 grid size-10 place-items-center rounded-full !bg-background shadow-lg opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:!bg-background active:!bg-roman active:scale-[0.92] transition";

  return (
    <section className="mb-12" aria-label={t.carousels.highlights}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{t.carousels.highlights}</h2>

        {/* Segmented control — the selected section is a raised chip. On narrow
            screens the whole track scrolls edge to edge (instead of being clipped
            inside its own pill), and the right edge fades to show there's more. */}
        <div className="w-full sm:w-auto overflow-x-auto scrollbar-hide max-sm:-mx-4 max-sm:px-4 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
        <div role="tablist" className="inline-flex w-max gap-0.5 rounded-full bg-roman/10 p-1 max-sm:mr-6">
          {visible.map((s) => {
            const selected = s.id === active.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(s.id)}
                className={`h-8 shrink-0 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition active:scale-[0.96] ${
                  selected
                    ? "bg-roman text-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
                    : "text-roman-muted/75 hover:text-roman-muted dark:text-white/85 dark:hover:text-white"
                }`}
              >
                {t.carousels[s.id]}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      <div className="group/row relative">
        {canScrollLeft && (
          <button onClick={() => scrollByPage(-1)} aria-label="Scroll left" className={`${arrowClass} -left-4`}>
            <ChevronLeft className="size-5" />
          </button>
        )}
        <div
          ref={scrollRef}
          key={active.id}
          role="tabpanel"
          // Fade only the edges that hide more cards, so the cut-off reads as "keep going".
          style={{
            maskImage: `linear-gradient(to right, ${canScrollLeft ? "transparent, black 48px" : "black"}, ${canScrollRight ? "black calc(100% - 48px), transparent" : "black"})`,
          }}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-px-4 -mx-4 px-4 lg:-mx-8 lg:px-8 lg:scroll-px-8 py-1 animate-in fade-in-0 duration-300"
        >
          {active.movies.map((movie, i) => (
            <HighlightCard key={movie.id} movie={movie} locale={locale} priority={i < 3} />
          ))}
        </div>
        {canScrollRight && (
          <button onClick={() => scrollByPage(1)} aria-label="Scroll right" className={`${arrowClass} -right-4`}>
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>
    </section>
  );
}
