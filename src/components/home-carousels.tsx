"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PosterImage } from "@/components/ui/poster-image";
import { useLang } from "@/lib/lang";
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

function CarouselCard({ movie, locale, priority }: { movie: MovieRecord; locale: string; priority?: boolean }) {
  const title = locale === "en" ? (movie.tmdbTitleEn ?? movie.title) : (movie.tmdbTitle ?? movie.title);
  const href = `/movies/${movie.slug ?? movie.id}`;

  return (
    <Link
      href={href}
      className="group flex-none w-28 flex flex-col gap-1.5"
    >
      <div className="relative w-28 aspect-[2/3] rounded overflow-hidden bg-card border border-border/50 group-hover:border-border transition-colors">
        <PosterImage
          primary={movie.tmdbPosterUrl ?? undefined}
          fallback={movie.posterUrl ?? undefined}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          placeholderClassName="w-full h-full bg-card"
          priority={priority}
        />
      </div>
      <p className="text-[11px] leading-tight text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
        {title}
      </p>
    </Link>
  );
}

function CarouselRow({ section, locale, isFirst }: { section: CarouselSection; locale: string; isFirst?: boolean }) {
  const { t } = useLang();
  const label = t.carousels[section.id];
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
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateArrows); ro.disconnect(); };
  }, [updateArrows]);

  function scroll(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-0.5 h-5 bg-roman rounded-full" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/70">
          {label}
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {section.movies.map((movie, i) => (
          <CarouselCard key={movie.id} movie={movie} locale={locale} priority={isFirst && i === 0} />
        ))}
      </div>
    </div>
  );
}

interface HomeCarouselsProps {
  sections: CarouselSection[];
}

export function HomeCarousels({ sections }: HomeCarouselsProps) {
  const { locale, t } = useLang();
  const [open, setOpen] = useState(true);
  const visible = sections.filter((s) => s.movies.length > 0);

  if (visible.length === 0) return null;

  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 w-full mb-4 group"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/50 group-hover:text-foreground/70 transition-colors">
          {t.carousels.highlights}
        </span>
        <div className="flex-1 h-px bg-border" />
        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && visible.map((section, i) => (
        <CarouselRow key={section.id} section={section} locale={locale} isFirst={i === 0} />
      ))}
    </div>
  );
}
