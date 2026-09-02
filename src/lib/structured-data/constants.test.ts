import test from "node:test";
import assert from "node:assert/strict";
import { isUsableSlug, moviePath } from "./constants.ts";

test("accepts a well-formed slug", () => {
  assert.equal(isUsableSlug("strade-perdute-1997"), true);
  assert.equal(isUsableSlug("1917-2019"), true);
});

test("rejects slugs the backend derives from a non-Latin title", () => {
  // The ASCII-only transform leaves nothing but the year.
  assert.equal(isUsableSlug("-2017"), false);
  assert.equal(isUsableSlug(""), false);
  assert.equal(isUsableSlug(undefined), false);
});

test("rejects an all-digit slug, which /movies/[id] would route to the id lookup", () => {
  assert.equal(isUsableSlug("2017"), false);
});

test("rejects slugs that are not already URL-safe", () => {
  assert.equal(isUsableSlug("Strade Perdute"), false);
  assert.equal(isUsableSlug("il-terzo/omicidio"), false);
  assert.equal(isUsableSlug("-leading"), false);
  assert.equal(isUsableSlug("trailing-"), false);
});

test("moviePath falls back to the numeric id for an unusable slug", () => {
  assert.equal(moviePath({ id: 88, slug: "-2017" }), "/movies/88");
  assert.equal(moviePath({ id: 88, slug: undefined }), "/movies/88");
  assert.equal(moviePath({ id: 88, slug: "il-terzo-omicidio-2017" }), "/movies/il-terzo-omicidio-2017");
});
