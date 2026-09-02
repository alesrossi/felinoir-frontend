import test from "node:test";
import assert from "node:assert/strict";
import { pickOgShowtimes, romeWallClockKey } from "./showtimes.ts";

// 2026-09-02 18:00 Rome (CEST, +02:00).
const NOW = new Date("2026-09-02T16:00:00Z");

const s = (cinemaId: string, datetime: string, isOV = false) => ({ cinemaId, datetime, isOV });

test("reads now as a Rome wall clock, not UTC", () => {
  assert.equal(romeWallClockKey(NOW), "2026-09-02T18:00");
  // Winter: the same UTC hour is one hour earlier in Rome.
  assert.equal(romeWallClockKey(new Date("2026-12-02T16:00:00Z")), "2026-12-02T17:00");
});

test("keeps today when the evening is still ahead", () => {
  const picked = pickOgShowtimes([
    s("nuovo-sacher", "2026-09-02T21:00:00"),
    s("nuovo-sacher", "2026-09-03T21:00:00"),
  ], NOW);
  assert.equal(picked.date, "2026-09-02");
  assert.equal(picked.isToday, true);
});

test("drops screenings that already started", () => {
  const picked = pickOgShowtimes([
    s("nuovo-sacher", "2026-09-02T16:30:00"),
    s("nuovo-sacher", "2026-09-02T21:00:00"),
  ], NOW);
  assert.deepEqual(picked.cinemas[0].times, ["21:00"]);
});

test("rolls to the next day once today is over, and says so", () => {
  const picked = pickOgShowtimes([
    s("nuovo-sacher", "2026-09-02T15:00:00"),
    s("nuovo-sacher", "2026-09-04T18:30:00"),
  ], NOW);
  assert.equal(picked.date, "2026-09-04");
  assert.equal(picked.isToday, false);
});

test("orders cinemas by their earliest start and caps at three", () => {
  const picked = pickOgShowtimes([
    s("c-late", "2026-09-02T22:30:00"),
    s("a-early", "2026-09-02T18:30:00"),
    s("b-mid", "2026-09-02T20:00:00"),
    s("d-latest", "2026-09-02T23:00:00"),
  ], NOW);
  assert.deepEqual(picked.cinemas.map((c) => c.cinemaId), ["a-early", "b-mid", "c-late"]);
  assert.equal(picked.extraCinemas, 1);
});

test("caps times per cinema and reports the remainder", () => {
  const picked = pickOgShowtimes([
    s("x", "2026-09-02T18:30:00"),
    s("x", "2026-09-02T19:30:00"),
    s("x", "2026-09-02T20:30:00"),
    s("x", "2026-09-02T21:30:00"),
    s("x", "2026-09-02T22:30:00"),
  ], NOW);
  assert.deepEqual(picked.cinemas[0].times, ["18:30", "19:30", "20:30", "21:30"]);
  assert.equal(picked.cinemas[0].extraTimes, 1);
});

test("de-duplicates identical times at one cinema", () => {
  const picked = pickOgShowtimes([
    s("x", "2026-09-02T20:00:00"),
    s("x", "2026-09-02T20:00:00"),
  ], NOW);
  assert.deepEqual(picked.cinemas[0].times, ["20:00"]);
});

test("flags an original-version showing on the chosen day", () => {
  assert.equal(pickOgShowtimes([s("x", "2026-09-02T20:00:00", true)], NOW).anyOV, true);
  assert.equal(pickOgShowtimes([s("x", "2026-09-02T20:00:00", false)], NOW).anyOV, false);
});

test("returns an empty result rather than throwing when nothing is upcoming", () => {
  const picked = pickOgShowtimes([s("x", "2026-08-01T20:00:00")], NOW);
  assert.equal(picked.date, null);
  assert.deepEqual(picked.cinemas, []);
});
