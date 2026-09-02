import test from "node:test";
import assert from "node:assert/strict";
import { buildMovie } from "./movie.ts";
import { serializeJsonLd } from "./serialize.ts";
import type { ApiMovie } from "@/lib/api/types";

function movie(overrides: Partial<ApiMovie> = {}): ApiMovie {
  return {
    id: 147,
    slug: "strade-perdute-1997",
    title: "Strade perdute",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    tmdbId: 147,
    imdbId: "tt0116922",
    tmdbTitle: "Strade perdute",
    tmdbTitleEn: "Lost Highway",
    tmdbOriginalTitle: "Lost Highway",
    tmdbPlot: "Un sassofonista viene accusato dell'omicidio della moglie.",
    tmdbPlotEn: "A saxophonist is accused of murdering his wife.",
    tmdbGenre: "Thriller, Mistero",
    tmdbGenreEn: "Thriller, Mystery",
    tmdbLanguage: "en",
    tmdbCountry: "US",
    tmdbPosterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
    director: "David Lynch",
    actors: "Bill Pullman, Patricia Arquette, Balthazar Getty",
    durationMinutes: 134,
    released: "1997-01-15",
    ...overrides,
  };
}

test("links the film to TMDB and IMDb", () => {
  const data = buildMovie(movie(), "it");
  assert.deepEqual(data.sameAs, [
    "https://www.themoviedb.org/movie/147",
    "https://www.imdb.com/title/tt0116922/",
  ]);
});

test("@id and url follow the canonical slug URL", () => {
  const data = buildMovie(movie(), "it");
  assert.equal(data["@id"], "https://felinoir.it/movies/strade-perdute-1997#film");
  assert.equal(data.url, "https://felinoir.it/movies/strade-perdute-1997");
});

test("falls back to the numeric id when there is no slug", () => {
  const data = buildMovie(movie({ slug: undefined }), "it");
  assert.equal(data["@id"], "https://felinoir.it/movies/147#film");
});

test("IT and EN variants differ in name, alternateName, description and genre", () => {
  const it = buildMovie(movie(), "it");
  const en = buildMovie(movie(), "en");

  assert.equal(it.name, "Strade perdute");
  assert.equal(en.name, "Lost Highway");
  assert.notDeepEqual(it.name, en.name);

  assert.deepEqual(it.alternateName, ["Lost Highway"]);
  assert.deepEqual(en.alternateName, ["Strade perdute"]);

  assert.match(it.description!, /sassofonista/);
  assert.match(en.description!, /saxophonist/);

  assert.deepEqual(it.genre, ["Thriller", "Mistero"]);
  assert.deepEqual(en.genre, ["Thriller", "Mystery"]);

  // inLanguage describes the film's audio, not the UI locale, so it is stable.
  assert.equal(it.inLanguage, "en");
  assert.equal(en.inLanguage, "en");
});

test("never repeats the display name inside alternateName", () => {
  // Same title in both locales: only the original title remains an alternate.
  const data = buildMovie(movie({ tmdbTitleEn: "Strade perdute" }), "en");
  assert.equal(data.name, "Strade perdute");
  assert.deepEqual(data.alternateName, ["Lost Highway"]);

  // Nothing left to add once every title is identical.
  const single = buildMovie(
    movie({ tmdbTitleEn: "Strade perdute", tmdbOriginalTitle: "Strade perdute", originalTitle: undefined }),
    "en",
  );
  assert.ok(!("alternateName" in single));
});

test("formats runtime as an ISO 8601 duration", () => {
  assert.equal(buildMovie(movie(), "it").duration, "PT134M");
});

test("expands people into Person nodes", () => {
  const data = buildMovie(movie(), "it");
  assert.deepEqual(data.director, [{ "@type": "Person", name: "David Lynch" }]);
  assert.equal(data.actor?.length, 3);
  assert.deepEqual(data.actor?.[0], { "@type": "Person", name: "Bill Pullman" });
  assert.deepEqual(data.countryOfOrigin, [{ "@type": "Country", name: "US" }]);
});

test("omits missing fields rather than emitting null or empty strings", () => {
  const sparse = buildMovie(
    movie({
      imdbId: undefined,
      tmdbId: undefined,
      director: undefined,
      actors: "",
      durationMinutes: undefined,
      released: undefined,
      tmdbPlot: undefined,
      tmdbPlotEn: undefined,
      synopsis: undefined,
      tmdbGenre: undefined,
      tmdbGenreEn: undefined,
      genres: [],
      tmdbCountry: undefined,
      tmdbLanguage: undefined,
      tmdbPosterUrl: undefined,
      posterUrl: undefined,
    }),
    "it",
  );

  for (const key of [
    "sameAs",
    "director",
    "actor",
    "duration",
    "datePublished",
    "dateCreated",
    "description",
    "genre",
    "countryOfOrigin",
    "inLanguage",
    "image",
  ]) {
    assert.ok(!(key in sparse), `${key} should be absent, got ${JSON.stringify(sparse)}`);
  }

  // The required fields still make a valid node.
  assert.equal(sparse["@type"], "Movie");
  assert.equal(sparse.name, "Strade perdute");

  const serialized = serializeJsonLd(sparse);
  assert.doesNotMatch(serialized, /null/);
  assert.doesNotMatch(serialized, /:""/);
});

test("treats N/A placeholders from the enrichment feeds as missing", () => {
  const data = buildMovie(movie({ director: "N/A", actors: "N/A", tmdbCountry: "N/A" }), "it");
  assert.ok(!("director" in data));
  assert.ok(!("actor" in data));
  assert.ok(!("countryOfOrigin" in data));
});

test("keeps a year-only release as dateCreated, not a bogus datePublished", () => {
  const data = buildMovie(movie({ released: "1997" }), "it");
  assert.equal(data.datePublished, undefined);
  assert.equal(data.dateCreated, "1997");
});

test("uses datePublished for a full release date and drops the duplicate year", () => {
  const data = buildMovie(movie(), "it");
  assert.equal(data.datePublished, "1997-01-15");
  assert.equal(data.dateCreated, undefined);
});
