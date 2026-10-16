"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Film, X, ChevronLeft, ChevronRight, Share2, Check, CalendarPlus, ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/lang";
import { moviePath } from "@/lib/structured-data/constants";
import { downloadShowingIcs, showingShareText } from "@/lib/showing-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScreeningSlot {
  id: number;
  datetime: string;
  time: string;
  is3D: boolean;
  isOV: boolean;
  bookingUrl?: string;
}

export interface MovieRowData {
  movieId: number;
  movieSlug?: string;
  title: string;
  titleEn?: string;
  durationMinutes?: number;
  posterUrl?: string;
  byDate: Record<string, ScreeningSlot[]>;
}

export interface DateColumn {
  iso: string;
  weekday: string;
  day: string;
  month: string;
}

interface Props {
  dates: DateColumn[];   // full date range from server
  rows: MovieRowData[];
  cinemaName?: string;
  cinemaWebsite?: string;
}

export const PAGE_SIZE = 7; // one week — also defined in page.tsx, keep in sync

function formatRuntime(minutes?: number): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------------------------------------------------------------------------
// Poster thumbnail
// ---------------------------------------------------------------------------

function PosterThumb({ src, className }: { src?: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} grid place-items-center bg-foreground/[0.06]`}>
        <Film className="size-4 text-foreground/25" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={`${className} object-cover`} />
  );
}

// ---------------------------------------------------------------------------
// Modal — one day's screenings for one film, with booking + copy
// ---------------------------------------------------------------------------

interface ModalPayload {
  title: string;
  cinemaName?: string;
  cinemaWebsite?: string;
  posterUrl?: string;
  date: string;
  slots: ScreeningSlot[];
  selectedId: number;
}

const iconButton =
  "btn-roman grid size-8 place-items-center rounded-full active:scale-[0.92]";

function Modal({ payload, onClose }: { payload: ModalPayload; onClose: () => void }) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { t, locale } = useLang();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const context = { movieTitle: payload.title, cinemaName: payload.cinemaName ?? "" };

  function copySlot(slot: ScreeningSlot) {
    navigator.clipboard.writeText(showingShareText(slot, { ...context, dateLabel: payload.date, locale })).catch(() => {});
    setCopiedId(slot.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={payload.title}
        className="relative z-10 flex w-full max-w-sm max-h-[85vh] flex-col rounded-2xl bg-popover p-5 shadow-2xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-4 shrink-0">
          <PosterThumb src={payload.posterUrl} className="w-12 aspect-[2/3] shrink-0 rounded-md ring-1 ring-foreground/10" />
          <div className="min-w-0 pt-0.5">
            <p className="font-serif text-lg font-medium leading-tight tracking-[-0.01em] text-foreground">{payload.title}</p>
            <p className="mt-1 text-sm capitalize text-foreground/60">{payload.date}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-roman -mr-1 -mt-1 ml-auto grid size-8 shrink-0 place-items-center rounded-full active:scale-[0.92]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {payload.slots.map((slot) => {
            const href = slot.bookingUrl ?? payload.cinemaWebsite;
            const isCopied = copiedId === slot.id;
            const isSelected = slot.id === payload.selectedId;
            return (
              <li
                key={slot.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  isSelected ? "bg-roman/10 ring-1 ring-inset ring-roman/30" : "bg-foreground/[0.04]"
                }`}
              >
                <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{slot.time}</span>
                <span className="flex gap-1">
                  {slot.isOV && <span className="rounded px-1 text-[10px] font-bold tracking-wide text-roman-muted ring-1 ring-inset ring-roman/35">OV</span>}
                  {slot.is3D && <span className="rounded px-1 text-[10px] font-bold tracking-wide text-foreground/60 ring-1 ring-inset ring-foreground/20">3D</span>}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => copySlot(slot)}
                    aria-label={t.cinema.copy}
                    title={t.cinema.copy}
                    className={iconButton}
                  >
                    {isCopied ? <Check className="size-3.5 text-green-500" /> : <Share2 className="size-3.5" />}
                  </button>
                  <button
                    onClick={() => downloadShowingIcs(slot, context)}
                    aria-label={t.schedule.addToCalendar}
                    title={t.schedule.addToCalendar}
                    className={iconButton}
                  >
                    <CalendarPlus className="size-3.5" />
                  </button>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-roman inline-flex h-8 items-center gap-1 rounded-full pl-3 pr-2.5 text-xs font-semibold active:scale-[0.96]"
                    >
                      {t.cinema.book}
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid — films × one week of days
// ---------------------------------------------------------------------------

export function CinemaScheduleGrid({ dates, rows, cinemaName, cinemaWebsite }: Props) {
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { t, locale } = useLang();
  const localeStr = locale === "en" ? "en-GB" : "it-IT";

  const todayIso = dates[0]?.iso;
  const visibleDates = dates.slice(offset, offset + PAGE_SIZE);
  const lastVisible = visibleDates[visibleDates.length - 1]?.iso ?? "";

  const titleOf = (row: MovieRowData) => (locale === "en" ? (row.titleEn ?? row.title) : row.title);

  function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
    return new Date(iso + "T00:00:00").toLocaleDateString(localeStr, opts);
  }

  // Films showing this week, busiest first; the rest move to "Later on" with
  // their next date, instead of filling the grid with empty rows.
  const { active, later, screeningCount } = useMemo(() => {
    const countIn = (row: MovieRowData) =>
      visibleDates.reduce((n, dc) => n + (row.byDate[dc.iso]?.length ?? 0), 0);

    const active = rows
      .map((row) => ({ row, count: countIn(row) }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count || a.row.title.localeCompare(b.row.title));

    const later = rows
      .filter((row) => countIn(row) === 0)
      .map((row) => ({
        row,
        next: dates.find((dc) => dc.iso > lastVisible && (row.byDate[dc.iso]?.length ?? 0) > 0)?.iso,
      }))
      .filter((r): r is { row: MovieRowData; next: string } => !!r.next)
      .sort((a, b) => a.next.localeCompare(b.next));

    return { active, later, screeningCount: active.reduce((n, r) => n + r.count, 0) };
  }, [rows, dates, visibleDates, lastVisible]);

  function goTo(newOffset: number) {
    setOffset(newOffset);
    const top = gridRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) {
      gridRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }
  }

  function jumpToDate(iso: string) {
    const idx = dates.findIndex((dc) => dc.iso === iso);
    if (idx >= 0) goTo(Math.floor(idx / PAGE_SIZE) * PAGE_SIZE);
  }

  // "15 – 21 ottobre", or "28 ott – 3 nov" when the week spans two months
  const first = visibleDates[0]?.iso;
  const weekLabel = first && lastVisible
    ? first.slice(0, 7) === lastVisible.slice(0, 7)
      ? `${fmt(first, { day: "numeric" })} – ${fmt(lastVisible, { day: "numeric", month: "long" })}`
      : `${fmt(first, { day: "numeric", month: "short" })} – ${fmt(lastVisible, { day: "numeric", month: "short" })}`
    : "";

  const gridCols = { gridTemplateColumns: `minmax(200px, 1.25fr) repeat(${visibleDates.length}, minmax(0, 1fr))` };
  const stepClass =
    "btn-roman grid size-8 place-items-center rounded-full active:scale-[0.92] disabled:opacity-25 disabled:pointer-events-none";

  return (
    <>
      {/* ── Toolbar: summary + week stepper ── */}
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{t.cinema.showtimes}</h2>
          <p className="mt-0.5 text-sm tabular-nums text-foreground/55">
            {t.cinema.films(active.length)} · {t.cinema.screenings(screeningCount)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => goTo(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0} className={stepClass} aria-label={t.schedule.previous}>
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[132px] text-center text-sm font-semibold tabular-nums text-foreground">{weekLabel}</span>
          <button onClick={() => goTo(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= dates.length} className={stepClass} aria-label={t.schedule.next}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div ref={gridRef} className="scroll-mt-4 max-lg:-mx-4 max-lg:overflow-x-auto max-lg:px-4">
        <div className="max-lg:min-w-[860px]">
          {/* Day header — sticky, turns into a material over scrolled rows */}
          <div
            style={gridCols}
            className="sticky top-0 z-10 grid bg-background/80 backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_0_hsl(var(--foreground)/0.08)]"
          >
            <div />
            {visibleDates.map((dc) => {
              const isToday = dc.iso === todayIso;
              return (
                <div key={dc.iso} className={`py-2.5 text-center ${isToday ? "rounded-t-lg bg-foreground/[0.035]" : ""}`}>
                  <span className={`block text-[11px] font-semibold uppercase tracking-wider ${isToday ? "text-roman-muted" : "text-foreground/50"}`}>
                    {isToday ? t.schedule.today : fmt(dc.iso, { weekday: "short" })}
                  </span>
                  <span className="mt-0.5 block text-xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
                    {Number(dc.iso.slice(8))}
                  </span>
                  <span className="mt-1 block text-[11px] capitalize text-foreground/45">{fmt(dc.iso, { month: "short" })}</span>
                </div>
              );
            })}
          </div>

          {active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-foreground/45">
              <Film className="size-7 opacity-40" />
              <p className="font-serif italic text-lg">{t.cinema.noneThisWeek}</p>
            </div>
          ) : (
            <ul>
              {active.map(({ row }) => {
                const title = titleOf(row);
                const runtime = formatRuntime(row.durationMinutes);
                return (
                  <li key={row.movieId} style={gridCols} className="grid border-b border-foreground/[0.07]">
                    {/* Film */}
                    <Link
                      href={moviePath({ id: row.movieId, slug: row.movieSlug })}
                      className="group flex items-center gap-3 py-3 pr-4"
                    >
                      <PosterThumb
                        src={row.posterUrl}
                        className="w-12 aspect-[2/3] shrink-0 rounded-md ring-1 ring-foreground/10 shadow-sm transition group-hover:ring-roman/40"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-roman-muted transition-colors">
                          {title}
                        </p>
                        {runtime && <p className="mt-0.5 text-xs tabular-nums text-foreground/50">{runtime}</p>}
                      </div>
                    </Link>

                    {/* Days */}
                    {visibleDates.map((dc) => {
                      const slots = row.byDate[dc.iso] ?? [];
                      const isToday = dc.iso === todayIso;
                      const dateLabel = fmt(dc.iso, { weekday: "long", day: "numeric", month: "long" });
                      return (
                        <div
                          key={dc.iso}
                          className={`flex flex-wrap content-center justify-center gap-1 px-1 py-3 ${isToday ? "bg-foreground/[0.035]" : ""}`}
                        >
                          {slots.map((slot) => (
                            <button
                              key={slot.id}
                              onClick={() =>
                                setModal({ title, cinemaName, cinemaWebsite, posterUrl: row.posterUrl, date: dateLabel, slots, selectedId: slot.id })
                              }
                              className="btn-roman inline-flex items-baseline gap-1 rounded-md px-2 py-1 text-[13px] font-semibold tabular-nums active:scale-[0.95]"
                            >
                              {slot.time}
                              {slot.isOV && <span className="text-[9px] font-bold tracking-wide opacity-75">OV</span>}
                              {slot.is3D && <span className="text-[9px] font-bold tracking-wide opacity-75">3D</span>}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Later on: films with nothing this week, and when they're next on ── */}
      {later.length > 0 && (
        <section className="mt-12">
          <h3 className="mb-3 text-sm font-semibold text-foreground/70">{t.cinema.laterOn}</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-1">
            {later.map(({ row, next }) => (
              <button
                key={row.movieId}
                onClick={() => jumpToDate(next)}
                className="flex items-center gap-3 rounded-xl p-2 text-left hover:bg-foreground/[0.04] active:scale-[0.99] transition"
              >
                <PosterThumb src={row.posterUrl} className="w-9 aspect-[2/3] shrink-0 rounded ring-1 ring-foreground/10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{titleOf(row)}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    {t.cinema.nextShowing}: {fmt(next, { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {modal && <Modal payload={modal} onClose={() => setModal(null)} />}
    </>
  );
}
