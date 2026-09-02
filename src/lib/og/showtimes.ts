// Chooses what the share card shows: one day of screenings at the few cinemas
// with the earliest start. Pure so it can be tested without a backend.

import { romeWallClock } from "../structured-data/rome-time.ts";

export interface OgScreening {
  cinemaId: string;
  /** Rome wall clock, `YYYY-MM-DDTHH:MM…` — the same reading the UI slices. */
  datetime: string;
  isOV?: boolean;
}

export interface OgCinemaTimes {
  cinemaId: string;
  times: string[];
  /** More times exist that did not fit. */
  extraTimes: number;
}

export interface OgShowtimes {
  /** `YYYY-MM-DD` in Rome, or null when nothing upcoming was found. */
  date: string | null;
  /** True when `date` is today in Rome — the card says "OGGI" instead of a date. */
  isToday: boolean;
  cinemas: OgCinemaTimes[];
  /** Cinemas on that date beyond the ones listed. */
  extraCinemas: number;
  anyOV: boolean;
}

export const OG_MAX_CINEMAS = 3;
export const OG_MAX_TIMES = 4;

/** The Rome wall clock of an instant as a sortable `YYYY-MM-DDTHH:MM` string. */
export function romeWallClockKey(instant: Date): string {
  const w = romeWallClock(instant);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${w.year}-${p(w.month)}-${p(w.day)}T${p(w.hour)}:${p(w.minute)}`;
}

/**
 * Screening `datetime` values are Rome wall clocks, so "upcoming" is a string
 * comparison against the Rome wall clock of now — no timezone conversion, which
 * is exactly how the rest of the app reads these values.
 */
export function pickOgShowtimes(
  screenings: OgScreening[],
  now: Date,
  options: { maxCinemas?: number; maxTimes?: number } = {},
): OgShowtimes {
  const maxCinemas = options.maxCinemas ?? OG_MAX_CINEMAS;
  const maxTimes = options.maxTimes ?? OG_MAX_TIMES;
  const nowKey = romeWallClockKey(now);
  const today = nowKey.slice(0, 10);

  const upcoming = screenings
    .filter((s) => s.datetime.slice(0, 16) >= nowKey)
    .sort((a, b) => a.datetime.localeCompare(b.datetime));

  const empty: OgShowtimes = { date: null, isToday: false, cinemas: [], extraCinemas: 0, anyOV: false };
  if (upcoming.length === 0) return empty;

  // The soonest day with anything left — today when the evening is still ahead,
  // otherwise whatever comes next, which the card labels with its date.
  const date = upcoming[0].datetime.slice(0, 10);
  const onDate = upcoming.filter((s) => s.datetime.startsWith(date));

  const byCinema = new Map<string, string[]>();
  for (const s of onDate) {
    const time = s.datetime.slice(11, 16);
    const times = byCinema.get(s.cinemaId);
    if (!times) byCinema.set(s.cinemaId, [time]);
    else if (!times.includes(time)) times.push(time);
  }

  const ordered = [...byCinema.entries()].sort((a, b) => a[1][0].localeCompare(b[1][0]));

  return {
    date,
    isToday: date === today,
    cinemas: ordered.slice(0, maxCinemas).map(([cinemaId, times]) => ({
      cinemaId,
      times: times.slice(0, maxTimes),
      extraTimes: Math.max(0, times.length - maxTimes),
    })),
    extraCinemas: Math.max(0, ordered.length - maxCinemas),
    anyOV: onDate.some((s) => s.isOV),
  };
}
