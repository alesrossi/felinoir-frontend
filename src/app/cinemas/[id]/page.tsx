import { notFound } from "next/navigation";
import { getScreenings } from "@/lib/api/screenings";
import type { ApiScreening } from "@/lib/api/types";
import { MapPin } from "lucide-react";
import { getCinemaConfig } from "@/lib/cinemas-config";
import { mapsUrl } from "@/lib/utils";
import { CinemaPageNav } from "./cinema-page-nav";
import {
  CinemaScheduleGrid,
  type DateColumn,
  type MovieRowData,
  type ScreeningSlot,
} from "./cinema-schedule-grid";

const PAGE_SIZE = 5;

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDateColumn(isoDate: string): DateColumn {
  const d = new Date(isoDate + "T00:00:00");
  return {
    iso: isoDate,
    weekday: d.toLocaleDateString("it-IT", { weekday: "long" }),
    day: String(d.getDate()),
    month: d.toLocaleDateString("it-IT", { month: "long" }),
  };
}

function formatTime(isoDatetime: string): string {
  return isoDatetime.slice(11, 16);
}

function buildRows(screenings: ApiScreening[], dates: string[]): MovieRowData[] {
  const windowDates = new Set(dates.slice(0, PAGE_SIZE));
  const map = new Map<number, MovieRowData & { next5: number; total: number }>();

  for (const s of screenings) {
    const date = s.datetime.slice(0, 10);

    if (!map.has(s.movieId)) {
      const byDate: Record<string, ScreeningSlot[]> = {};
      for (const d of dates) byDate[d] = [];
      map.set(s.movieId, {
        movieId: s.movieId,
        movieSlug: s.movie?.slug,
        title: s.movie?.title ?? String(s.movieId),
        posterUrl: s.movie?.tmdbPosterUrl ?? s.movie?.posterUrl,
        byDate,
        next5: 0,
        total: 0,
      });
    }

    const entry = map.get(s.movieId)!;
    entry.total += 1;
    if (windowDates.has(date)) entry.next5 += 1;

    const slot: ScreeningSlot = {
      id: s.id,
      time: formatTime(s.datetime),
      is3D: s.is3D ?? false,
      isOV: s.isOV ?? false,
      bookingUrl: s.bookingUrl,
    };

    entry.byDate[date]?.push(slot);
  }

  // 1. Films with showings in the next 5 days first, ranked by that count
  // 2. Films outside the window after, ranked by total upcoming showings
  // 3. Alpha tiebreaker
  return [...map.values()].sort((a, b) => {
    const aInWindow = a.next5 > 0;
    const bInWindow = b.next5 > 0;
    if (aInWindow !== bInWindow) return aInWindow ? -1 : 1;
    const primary = aInWindow ? (b.next5 - a.next5) : (b.total - a.total);
    if (primary !== 0) return primary;
    return a.title.localeCompare(b.title);
  });
}

export default async function CinemaPage({ params }: PageProps) {
  const { id } = await params;

  const [config, screenings] = await Promise.all([
    Promise.resolve(getCinemaConfig(id)),
    getScreenings({ cinemaId: id, withRelations: true, limit: 1000 }),
  ]);

  if (!config) notFound();
  const cinema = config;

  const now = new Date().toISOString();

  const upcoming = screenings
    .filter((s) => s.datetime >= now)
    .sort((a, b) => a.datetime.localeCompare(b.datetime));

  // Build every consecutive day from today to the last scraped date.
  // Minimum window is 5 days so the first page always has columns even if
  // the cinema has no screenings yet.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const lastScraped = upcoming.reduce<string | null>(
    (max, s) => (max === null || s.datetime > max ? s.datetime.slice(0, 10) : max),
    null,
  );

  const toStr = (d: Date) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${dy}`;
  };

  const minEnd = new Date(todayStart);
  minEnd.setDate(minEnd.getDate() + 4);
  const endDate = lastScraped && lastScraped > toStr(minEnd)
    ? new Date(lastScraped + "T00:00:00")
    : minEnd;

  const allDates: string[] = [];
  for (const cur = new Date(todayStart); cur <= endDate; cur.setDate(cur.getDate() + 1)) {
    allDates.push(toStr(cur));
  }

  const dateColumns = allDates.map(formatDateColumn);
  const rows = buildRows(upcoming, allDates);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12">

        <CinemaPageNav websiteUrl={cinema.website} />

        {/* Cinema header */}
        <div className="mb-10 flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight">{cinema.name}</h1>
          {cinema.address && (
            <a
              href={mapsUrl(cinema.address, cinema.coordinates)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-roman-muted transition-colors"
            >
              <MapPin className="size-4 shrink-0" />
              {cinema.address}
            </a>
          )}
        </div>

        <CinemaScheduleGrid dates={dateColumns} rows={rows} cinemaName={cinema.name} cinemaWebsite={cinema.website} />
      </div>
    </div>
  );
}
