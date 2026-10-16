"use client";

import { useEffect, useState } from "react";
import { X, Share2, Check, CalendarPlus, ArrowUpRight } from "lucide-react";
import { PosterImage } from "@/components/ui/poster-image";
import { useLang } from "@/lib/lang";
import { downloadShowingIcs, showingShareText, type ShareableShowing } from "@/lib/showing-actions";

// ---------------------------------------------------------------------------
// One day's screenings of one film at one cinema, with book / share / calendar
// per time. Shared by the cinema schedule and the film page (map + list).
// ---------------------------------------------------------------------------

export interface ShowingModalProps {
  /** Header line — the film on a cinema's page, the cinema on a film's page. */
  title: string;
  /** Formatted date, e.g. "venerdì 16 ottobre". */
  dateLabel: string;
  posterUrl?: string;
  posterFallbackUrl?: string;
  /** Used for the shared text and the calendar event. */
  movieTitle?: string;
  cinemaName: string;
  cinemaWebsite?: string;
  showings: ShareableShowing[];
  /** The time the user clicked, highlighted in the list. */
  selectedId?: number;
  onClose: () => void;
}

const iconButton =
  "btn-roman grid size-8 place-items-center rounded-full active:scale-[0.92]";

export function ShowingModal({
  title,
  dateLabel,
  posterUrl,
  posterFallbackUrl,
  movieTitle,
  cinemaName,
  cinemaWebsite,
  showings,
  selectedId,
  onClose,
}: ShowingModalProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { t, locale } = useLang();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const context = { movieTitle, cinemaName };

  function copy(s: ShareableShowing) {
    navigator.clipboard.writeText(showingShareText(s, { ...context, dateLabel, locale })).catch(() => {});
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex w-full max-w-sm max-h-[85vh] flex-col rounded-2xl bg-popover p-5 shadow-2xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-4 shrink-0">
          <PosterImage
            primary={posterUrl}
            fallback={posterFallbackUrl}
            alt=""
            className="w-12 aspect-[2/3] shrink-0 rounded-md object-cover ring-1 ring-foreground/10"
            placeholderClassName="w-12 aspect-[2/3] shrink-0 rounded-md bg-foreground/[0.06]"
          />
          <div className="min-w-0 pt-0.5">
            <p className="font-serif text-lg font-medium leading-tight tracking-[-0.01em] text-foreground">{title}</p>
            <p className="mt-1 text-sm capitalize text-foreground/60">{dateLabel}</p>
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
          {showings.map((s) => {
            const href = s.bookingUrl ?? cinemaWebsite;
            const isCopied = copiedId === s.id;
            const isSelected = s.id === selectedId;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  // Dark mode: a darker grey instead of red, so the red buttons on
                  // the row don't sit red-on-red.
                  isSelected
                    ? "bg-roman/10 ring-1 ring-inset ring-roman/30 dark:bg-black/40 dark:ring-foreground/10"
                    : "bg-foreground/[0.04]"
                }`}
              >
                <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{s.time}</span>
                <span className="flex gap-1">
                  {s.isOV && <span className="rounded px-1 text-[10px] font-bold tracking-wide text-roman-muted ring-1 ring-inset ring-roman/35">OV</span>}
                  {s.is3D && <span className="rounded px-1 text-[10px] font-bold tracking-wide text-foreground/60 ring-1 ring-inset ring-foreground/20">3D</span>}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => copy(s)}
                    aria-label={t.cinema.copy}
                    title={t.cinema.copy}
                    className={iconButton}
                  >
                    {isCopied ? <Check className="size-3.5 text-green-500" /> : <Share2 className="size-3.5" />}
                  </button>
                  <button
                    onClick={() => downloadShowingIcs(s, context)}
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
