import test from "node:test";
import assert from "node:assert/strict";
import { buildMovieTheater, parseAddress } from "./theater.ts";
import type { CinemaConfig } from "@/lib/cinemas-config";

const SACHER: CinemaConfig = {
  id: "nuovo-sacher",
  name: "Nuovo Sacher",
  address: "Largo Ascianghi, 1, 00153 Roma RM",
  website: "https://www.sacherfilm.eu/",
  openAir: false,
  coordinates: { lat: 41.8797, lng: 12.4739 },
};

test("builds the theater node with a canonical @id", () => {
  const data = buildMovieTheater(SACHER);
  assert.equal(data["@id"], "https://felinoir.it/cinemas/nuovo-sacher#theater");
  assert.equal(data.url, "https://felinoir.it/cinemas/nuovo-sacher");
  assert.equal(data.name, "Nuovo Sacher");
  assert.deepEqual(data.geo, {
    "@type": "GeoCoordinates",
    latitude: 41.8797,
    longitude: 12.4739,
  });
  assert.deepEqual(data.sameAs, ["https://www.sacherfilm.eu/"]);
  assert.equal(data.publicAccess, true);
  // No reliable opening hours exist, so none are claimed.
  assert.ok(!("openingHoursSpecification" in data));
});

test("splits the standard registry address", () => {
  assert.deepEqual(parseAddress("Largo Ascianghi, 1, 00153 Roma RM"), {
    "@type": "PostalAddress",
    streetAddress: "Largo Ascianghi, 1",
    addressLocality: "Roma",
    addressRegion: "RM",
    postalCode: "00153",
    addressCountry: "IT",
  });
});

test("handles a sub-locality and a trailing country", () => {
  assert.deepEqual(parseAddress("Viale dei Romagnoli, 515, 00121 Lido di Ostia, Roma RM"), {
    "@type": "PostalAddress",
    streetAddress: "Viale dei Romagnoli, 515",
    addressLocality: "Lido di Ostia",
    addressRegion: "RM",
    postalCode: "00121",
    addressCountry: "IT",
  });

  assert.deepEqual(parseAddress("UCI Cinemas, Via Alberto Lionello 201, 00139 Rome RM, Italy"), {
    "@type": "PostalAddress",
    streetAddress: "UCI Cinemas, Via Alberto Lionello 201",
    addressLocality: "Rome",
    addressRegion: "RM",
    postalCode: "00139",
    addressCountry: "IT",
  });
});

test("keeps the raw street when no postal code is present rather than guessing", () => {
  assert.deepEqual(parseAddress("Via Pier delle Vigne, 4, Roma"), {
    "@type": "PostalAddress",
    streetAddress: "Via Pier delle Vigne, 4, Roma",
    addressCountry: "IT",
  });
});

test("omits the address entirely when there is none", () => {
  assert.equal(parseAddress(undefined), undefined);
  assert.equal(parseAddress("  "), undefined);

  const data = buildMovieTheater({ ...SACHER, address: "", website: "" });
  assert.ok(!("address" in data));
  assert.ok(!("sameAs" in data));
});
