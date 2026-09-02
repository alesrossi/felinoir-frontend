import test from "node:test";
import assert from "node:assert/strict";
import { buildScreeningEvents } from "./screening.ts";
import { parseRomeWallClock } from "./rome-time.ts";
import type { ApiMovie, ApiScreening } from "@/lib/api/types";

const MOVIE: ApiMovie = {
  id: 147,
  slug: "strade-perdute-1997",
  title: "Strade perdute",
  durationMinutes: 134,
  tmdbLanguage: "en",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const CINEMA_NAMES = new Map([["nuovo-sacher", "Nuovo Sacher"]]);

function screening(overrides: Partial<ApiScreening> & { datetime: string }): ApiScreening {
  return {
    id: 1,
    movieId: 147,
    cinemaId: "nuovo-sacher",
    is3D: false,
    isOV: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function build(screenings: ApiScreening[], now: Date, options = {}) {
  return buildScreeningEvents({
    movie: MOVIE,
    movieName: "Strade perdute",
    screenings,
    cinemaNames: CINEMA_NAMES,
    now,
    ...options,
  });
}

test("startDate carries the correct offset on both sides of the DST boundary", () => {
  const now = parseRomeWallClock("2026-10-24T10:00:00")!;
  const events = build(
    [
      screening({ id: 1, datetime: "2026-10-24T21:30:00" }),
      screening({ id: 2, datetime: "2026-10-26T21:30:00" }),
    ],
    now,
  );

  assert.equal(events.length, 2);
  assert.equal(events[0].startDate, "2026-10-24T21:30:00+02:00");
  assert.equal(events[1].startDate, "2026-10-26T21:30:00+01:00");
});

test("endDate is start plus runtime and stays offset-correct", () => {
  const now = parseRomeWallClock("2026-10-24T10:00:00")!;
  const [event] = build([screening({ datetime: "2026-10-24T21:30:00" })], now);
  assert.equal(event.endDate, "2026-10-24T23:44:00+02:00");
});

test("endDate is omitted when the runtime is unknown", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  const [event] = buildScreeningEvents({
    movie: { ...MOVIE, durationMinutes: undefined },
    movieName: "Strade perdute",
    screenings: [screening({ datetime: "2026-07-01T21:30:00" })],
    cinemaNames: CINEMA_NAMES,
    now,
  });
  assert.ok(!("endDate" in event));
});

test("a screening running across the autumn transition ends at +01:00", () => {
  // 01:00 CEST + 134 minutes lands after clocks fall back to 02:00 CET.
  const now = parseRomeWallClock("2026-10-25T00:00:00")!;
  const [event] = build([screening({ datetime: "2026-10-25T01:00:00" })], now);
  assert.equal(event.startDate, "2026-10-25T01:00:00+02:00");
  assert.equal(event.endDate, "2026-10-25T02:14:00+01:00");
});

test("past screenings never appear", () => {
  const now = parseRomeWallClock("2026-07-01T20:00:00")!;
  const events = build(
    [
      screening({ id: 1, datetime: "2026-06-30T21:30:00" }), // yesterday
      screening({ id: 2, datetime: "2026-07-01T18:00:00" }), // earlier today
      screening({ id: 3, datetime: "2026-07-01T20:00:00" }), // starting right now
      screening({ id: 4, datetime: "2026-07-01T21:30:00" }), // later tonight
    ],
    now,
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].startDate, "2026-07-01T21:30:00+02:00");
});

test("the window covers today plus the next seven days and no further", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  const events = build(
    [
      screening({ id: 1, datetime: "2026-07-01T23:00:00" }),
      screening({ id: 2, datetime: "2026-07-08T23:00:00" }), // day 7, included
      screening({ id: 3, datetime: "2026-07-09T00:30:00" }), // day 8, excluded
    ],
    now,
  );

  assert.deepEqual(
    events.map((e) => e.startDate),
    ["2026-07-01T23:00:00+02:00", "2026-07-08T23:00:00+02:00"],
  );
});

test("output is sorted ascending and hard-capped", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  const many = Array.from({ length: 250 }, (_, i) =>
    screening({
      id: i,
      datetime: `2026-07-0${(i % 7) + 1}T${String(10 + (i % 12)).padStart(2, "0")}:00:00`,
    }),
  );

  const events = build(many, now, { maxEvents: 100, maxBytes: Infinity });
  assert.equal(events.length, 100);
  const starts = events.map((e) => e.startDate);
  assert.deepEqual(starts, [...starts].sort());
});

test("trims the tail when the byte budget is spent before the count cap", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  const many = Array.from({ length: 100 }, (_, i) =>
    screening({
      id: i,
      cinemaId: `cinema-multisala-con-un-nome-molto-lungo-${i % 30}`,
      datetime: `2026-07-0${(i % 7) + 1}T${String(10 + (i % 12)).padStart(2, "0")}:00:00`,
      bookingUrl: `https://www.example-cinema.it/booking/session/${100000 + i}`,
    }),
  );

  const events = build(many, now, { maxEvents: 100, maxBytes: 10_000 });
  assert.ok(events.length > 0);
  assert.ok(events.length < 100);
  assert.ok(JSON.stringify(events).length <= 10_000);
});

test("original-version screenings carry audio and subtitle languages", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  const [ov] = build([screening({ datetime: "2026-07-01T21:30:00", isOV: true })], now);
  assert.equal(ov.inLanguage, "en");
  assert.equal(ov.subtitleLanguage, "it");

  const [dubbed] = build([screening({ datetime: "2026-07-01T21:30:00", isOV: false })], now);
  assert.equal(dubbed.inLanguage, "it");
  assert.ok(!("subtitleLanguage" in dubbed));
});

test("references the film and the cinema by @id instead of inlining them", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  const [event] = build([screening({ datetime: "2026-07-01T21:30:00" })], now);

  assert.deepEqual(event.workPresented, {
    "@id": "https://felinoir.it/movies/strade-perdute-1997#film",
  });
  assert.deepEqual(event.location, { "@id": "https://felinoir.it/cinemas/nuovo-sacher#theater" });
  assert.equal(event.name, "Strade perdute — Nuovo Sacher");
  assert.equal(
    event["@id"],
    "https://felinoir.it/movies/strade-perdute-1997#screening-nuovo-sacher-2026-07-01T21:30:00+02:00",
  );
});

test("reports the projection format", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  const at = (o: Partial<ApiScreening>) =>
    build([screening({ datetime: "2026-07-01T21:30:00", ...o })], now)[0].videoFormat;

  assert.equal(at({}), "2D");
  assert.equal(at({ is3D: true }), "3D");
  assert.equal(at({ hall: "Sala IMAX" }), "IMAX");
  assert.equal(at({ hall: "Sala 4DX", is3D: true }), "4DX");
});

test("omits the booking url when there is none, and ignores other films", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  const events = build(
    [
      screening({ id: 1, datetime: "2026-07-01T21:30:00", bookingUrl: undefined }),
      screening({ id: 2, movieId: 999, datetime: "2026-07-01T22:00:00" }),
    ],
    now,
  );

  assert.equal(events.length, 1);
  assert.ok(!("url" in events[0]));
});

test("skips screenings whose datetime cannot be parsed", () => {
  const now = parseRomeWallClock("2026-07-01T10:00:00")!;
  assert.deepEqual(build([screening({ datetime: "not a date" })], now), []);
});
