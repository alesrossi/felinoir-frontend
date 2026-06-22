"use client";

import { useState } from "react";
import Link from "next/link";
import { Film, X, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/lang";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScreeningSlot {
  id: number;
  time: string;
  is3D: boolean;
  isOV: boolean;
  bookingUrl?: string;
}

export interface MovieRowData {
  movieId: number;
  movieSlug?: string;
  title: string;
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

export const PAGE_SIZE = 5; // also defined in page.tsx — keep in sync
const MAX_VISIBLE = 3;

// ---------------------------------------------------------------------------
// Time chip — modal only
// ---------------------------------------------------------------------------

function TimeChip({ slot, cinemaWebsite }: { slot: ScreeningSlot; cinemaWebsite?: string }) {
  const hasBadge = slot.is3D || slot.isOV;

  const inner = (
    <>
      <span className="tabular-nums font-bold text-sm leading-none">{slot.time}</span>
      {hasBadge && (
        <span className="flex gap-0.5 mt-1">
          {slot.is3D && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-auto">3D</Badge>}
          {slot.isOV && <Badge variant="outline"    className="text-[9px] px-1 py-0 h-auto text-roman-muted border-roman/40">OV</Badge>}
        </span>
      )}
    </>
  );

  const base = "inline-flex flex-col items-center rounded-md px-3 py-2 transition-colors";

  const href = slot.bookingUrl ?? cinemaWebsite;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-roman/10 text-roman-muted hover:bg-roman/20 border border-roman/25 hover:border-roman/40`}
      >
        {inner}
      </a>
    );
  }

  return <div className={`${base} bg-card border border-border text-foreground`}>{inner}</div>;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ModalPayload {
  title: string;
  cinemaName?: string;
  cinemaWebsite?: string;
  posterUrl?: string;
  date: string;
  slots: ScreeningSlot[];
}

function Modal({ payload, onClose }: { payload: ModalPayload; onClose: () => void }) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { locale } = useLang();

  function copySlot(slot: ScreeningSlot) {
    const ovLabel = locale === "en" ? "Original version" : "Versione originale";
    const lines = [
      payload.title,
      payload.cinemaName ?? "",
      payload.date,
      slot.time,
      slot.isOV ? ovLabel : "",
      slot.is3D ? "3D" : "",
      slot.bookingUrl ?? "",
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines).catch(() => {});
    setCopiedId(slot.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-5 shrink-0">
          {payload.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={payload.posterUrl}
              alt=""
              className="w-14 rounded shrink-0 border border-border object-cover aspect-[2/3]"
            />
          ) : (
            <div className="w-14 aspect-[2/3] rounded border border-border bg-background flex items-center justify-center shrink-0">
              <Film className="size-5 text-muted-foreground/30" />
            </div>
          )}
          <div className="min-w-0 pt-0.5">
            <p className="font-semibold text-foreground leading-snug">{payload.title}</p>
            <p className="text-sm text-roman-muted mt-1 capitalize">{payload.date}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2 items-center pr-1 pb-2">
            {payload.slots.map((slot) => {
              const isCopied = copiedId === slot.id;
              return (
                <div key={slot.id} className="flex items-center gap-2">
                  <TimeChip slot={slot} cinemaWebsite={payload.cinemaWebsite} />
                  <button
                    onClick={() => copySlot(slot)}
                    aria-label="Copy to clipboard"
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    {isCopied
                      ? <Check className="size-3.5 text-green-500" />
                      : <Copy className="size-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {payload.slots.length > 5 && (
          <div className="pointer-events-none shrink-0 h-8 -mt-8 relative z-10 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export function CinemaScheduleGrid({ dates, rows, cinemaName, cinemaWebsite }: Props) {
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const { t, locale } = useLang();
  const localeStr = locale === "en" ? "en-GB" : "it-IT";

  function formatCol(iso: string) {
    const d = new Date(iso + "T00:00:00");
    return {
      weekday: d.toLocaleDateString(localeStr, { weekday: "short" }).toUpperCase(),
      day: String(d.getDate()),
      month: d.toLocaleDateString(localeStr, { month: "short" }),
    };
  }



  const totalPages = Math.ceil(dates.length / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE); // 0-indexed
  const visibleDates = dates.slice(offset, offset + PAGE_SIZE);
  const visibleRows = [...rows].sort((a, b) => {
    const aHas = visibleDates.some(dc => (a.byDate[dc.iso]?.length ?? 0) > 0);
    const bHas = visibleDates.some(dc => (b.byDate[dc.iso]?.length ?? 0) > 0);
    if (aHas === bHas) return 0;
    return aHas ? -1 : 1;
  });

  const colPct = `${100 / (1 + visibleDates.length)}%`;

  return (
    <>
      {/* ── Pagination nav ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          disabled={offset === 0}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="size-4" />
          {t.schedule.previous}
        </button>

        <span className="text-xs text-muted-foreground">
          {currentPage + 1} / {totalPages}
        </span>

        <button
          onClick={() => setOffset((o) => Math.min(dates.length - PAGE_SIZE, o + PAGE_SIZE))}
          disabled={offset + PAGE_SIZE >= dates.length}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {t.schedule.next}
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="table-fixed w-full border-separate border-spacing-1">
          <colgroup>
            {[...Array(1 + visibleDates.length)].map((_, i) => (
              <col key={i} style={{ width: colPct }} />
            ))}
          </colgroup>

          {/* Date headers */}
          <thead>
            <tr>
              <th />
              {visibleDates.map((dc) => {
                const { weekday, day, month } = formatCol(dc.iso);
                return (
                  <th key={dc.iso} className="pb-4 text-center font-normal align-bottom">
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-roman-muted capitalize">
                      {weekday}
                    </span>
                    <span className="block text-2xl font-bold text-foreground leading-none mt-0.5">
                      {day}
                    </span>
                    <span className="block text-xs text-muted-foreground capitalize mt-0.5">
                      {month}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.movieId}>
                {/* Poster */}
                <td className="p-0">
                  <Link href={`/movies/${row.movieSlug ?? row.movieId}`} className="block group">
                    <div className="aspect-[2/3] w-full rounded-md overflow-hidden border border-border bg-card group-hover:border-roman/40 transition-colors">
                      {row.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.posterUrl}
                          alt={row.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                          <Film className="size-5 text-muted-foreground/30 shrink-0" />
                          <span className="text-xs font-semibold text-foreground/70 text-center leading-tight line-clamp-4">
                            {row.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </td>

                {/* Time cells — only for visible dates */}
                {visibleDates.map((dc) => {
                  const slots = row.byDate[dc.iso] ?? [];
                  const visible = slots.slice(0, MAX_VISIBLE);
                  const overflow = slots.length - MAX_VISIBLE;
                  const dateLabel = `${dc.weekday} ${dc.day} ${dc.month}`;

                  if (slots.length === 0) {
                    return (
                      <td key={dc.iso} className="p-0">
                        <div className="aspect-[2/3] w-full rounded-md border border-border/40 bg-card/20" />
                      </td>
                    );
                  }

                  return (
                    <td key={dc.iso} className="p-0">
                      <button
                        onClick={() =>
                          setModal({ title: row.title, cinemaName, cinemaWebsite, posterUrl: row.posterUrl, date: dateLabel, slots })
                        }
                        className="block w-full aspect-[2/3] rounded-md border border-border bg-card hover:border-roman/40 hover:bg-roman/5 transition-colors overflow-hidden cursor-pointer"
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 sm:gap-1.5 p-0.5 sm:p-1.5">
                          {visible.map((slot, i) => (
                            <div
                              key={slot.id}
                              className={[
                                "inline-flex flex-col items-center rounded sm:rounded-md px-1 py-1 sm:px-2.5 sm:py-1.5",
                                i > 1 ? "hidden sm:inline-flex" : "",
                                slot.bookingUrl
                                  ? "bg-roman/10 text-roman-muted border border-roman/25"
                                  : "bg-card border border-border text-foreground",
                              ].join(" ")}
                            >
                              <span className="tabular-nums font-bold text-[10px] sm:text-sm leading-none">
                                {slot.time}
                              </span>
                              {(slot.is3D || slot.isOV) && (
                                <span className="flex gap-0.5 mt-1">
                                  {slot.is3D && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-auto">3D</Badge>}
                                  {slot.isOV && <Badge variant="outline"    className="text-[9px] px-1 py-0 h-auto text-roman-muted border-roman/40">OV</Badge>}
                                </span>
                              )}
                            </div>
                          ))}
                          {slots.length > 2 && (
                            <span className="sm:hidden text-[9px] font-medium text-roman-muted w-full text-center">
                              +{slots.length - 2}
                            </span>
                          )}
                          {overflow > 0 && (
                            <span className="hidden sm:block text-[11px] font-medium text-roman-muted w-full text-center">
                              +{overflow}
                            </span>
                          )}
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <Modal payload={modal} onClose={() => setModal(null)} />}
    </>
  );
}
