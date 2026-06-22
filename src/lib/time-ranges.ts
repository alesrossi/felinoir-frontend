export interface TimeRange {
  id: string;
  label: string;   // shown to user
  start: number;   // minutes from midnight (inclusive)
  end: number;     // minutes from midnight (exclusive), -1 = wraps past midnight
}

export const TIME_RANGES: TimeRange[] = [
  { id: "morning",       label: "09:00 – 12:00", start: 540,  end: 720  },
  { id: "afternoon",     label: "12:00 – 16:00", start: 720,  end: 960  },
  { id: "late_afternoon",label: "16:00 – 19:00", start: 960,  end: 1140 },
  { id: "evening",       label: "19:00 – 23:00", start: 1140, end: 1380 },
  { id: "late_night",    label: "23:00 – 09:00", start: 1380, end: 540  }, // wraps midnight
];

/** Returns true if `minutes` (minutes from midnight) falls within the range. */
export function inTimeRange(range: TimeRange, minutes: number): boolean {
  if (range.end > range.start) {
    return minutes >= range.start && minutes < range.end;
  }
  // Wraps midnight (e.g. late_night: 23:00–09:00)
  return minutes >= range.start || minutes < range.end;
}

/** Extracts minutes-from-midnight from an ISO datetime string. */
export function minutesFromDatetime(datetime: string): number {
  const t = datetime.slice(11, 16); // "HH:MM"
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
