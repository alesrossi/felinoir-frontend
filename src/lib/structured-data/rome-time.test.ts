import test from "node:test";
import assert from "node:assert/strict";
import {
  formatRomeDateTime,
  formatRomeOffset,
  isoDuration,
  parseRomeWallClock,
  romeDateString,
  romeOffsetMinutes,
  startOfRomeDay,
} from "./rome-time.ts";

// Rome leaves CEST at 03:00 local on Sunday 25 October 2026.
test("emits +02:00 for a CEST screening", () => {
  const start = parseRomeWallClock("2026-10-24T21:30:00");
  assert.ok(start);
  assert.equal(formatRomeDateTime(start), "2026-10-24T21:30:00+02:00");
  assert.equal(formatRomeOffset(start), "+02:00");
  assert.equal(romeOffsetMinutes(start), 120);
});

test("emits +01:00 for a CET screening after the DST boundary", () => {
  const start = parseRomeWallClock("2026-10-26T21:30:00");
  assert.ok(start);
  assert.equal(formatRomeDateTime(start), "2026-10-26T21:30:00+01:00");
  assert.equal(formatRomeOffset(start), "+01:00");
  assert.equal(romeOffsetMinutes(start), 60);
});

test("the same wall-clock time two days later is 49 real hours apart", () => {
  // The clock repeats an hour on 25 October, so 48h of calendar time is 49h of
  // elapsed time. Getting this wrong is exactly what a hardcoded offset does.
  const before = parseRomeWallClock("2026-10-24T21:30:00")!;
  const after = parseRomeWallClock("2026-10-26T21:30:00")!;
  assert.equal((after.getTime() - before.getTime()) / 3_600_000, 49);
});

test("spring-forward boundary switches from +01:00 to +02:00", () => {
  // Clocks jump 02:00 -> 03:00 local on Sunday 29 March 2026.
  assert.equal(
    formatRomeDateTime(parseRomeWallClock("2026-03-28T21:30:00")!),
    "2026-03-28T21:30:00+01:00",
  );
  assert.equal(
    formatRomeDateTime(parseRomeWallClock("2026-03-29T21:30:00")!),
    "2026-03-29T21:30:00+02:00",
  );
});

test("the wall clock in the string wins over any trailing zone marker", () => {
  // The rest of the app renders showtimes by slicing chars 11-16, so 21:30 is
  // what the user sees regardless of the suffix the backend appends.
  const withZ = parseRomeWallClock("2026-07-01T21:30:00.000Z");
  assert.equal(formatRomeDateTime(withZ!), "2026-07-01T21:30:00+02:00");

  const naive = parseRomeWallClock("2026-07-01 21:30");
  assert.equal(formatRomeDateTime(naive!), "2026-07-01T21:30:00+02:00");
});

test("rejects unparseable datetimes instead of guessing", () => {
  assert.equal(parseRomeWallClock(""), null);
  assert.equal(parseRomeWallClock("tomorrow at nine"), null);
});

test("startOfRomeDay walks calendar days across the DST boundary", () => {
  const friday = parseRomeWallClock("2026-10-23T21:30:00")!;
  assert.equal(romeDateString(startOfRomeDay(friday)), "2026-10-23");
  assert.equal(formatRomeDateTime(startOfRomeDay(friday)), "2026-10-23T00:00:00+02:00");
  // Eight calendar days later, on the other side of the transition.
  assert.equal(formatRomeDateTime(startOfRomeDay(friday, 8)), "2026-10-31T00:00:00+01:00");
});

test("isoDuration formats minutes and omits unknown runtimes", () => {
  assert.equal(isoDuration(134), "PT134M");
  assert.equal(isoDuration(98), "PT98M");
  assert.equal(isoDuration(undefined), undefined);
  assert.equal(isoDuration(0), undefined);
});
