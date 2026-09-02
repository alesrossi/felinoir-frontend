import { cinemaNodeId, cinemaUrl } from "./constants.ts";
import { compact } from "./serialize.ts";
import { clean } from "./text.ts";
import type { MovieTheater, PostalAddress } from "./schema-types.ts";
import type { CinemaConfig } from "@/lib/cinemas-config";

const POSTAL_CODE = /\b(\d{5})\b/;

/**
 * Splits the free-text address in `cinemas.yml` into a `PostalAddress`.
 *
 * The registry is consistently "<street>, <CAP> <Locality> RM[, Italy]", so we
 * anchor on the five-digit CAP. When there is no CAP we keep the whole string
 * as `streetAddress` rather than guessing at the parts.
 */
export function parseAddress(address: string | undefined): PostalAddress | undefined {
  const value = clean(address);
  if (!value) return undefined;

  const withoutCountry = value.replace(/,\s*ital(?:y|ia)\s*$/i, "").trim();
  const match = POSTAL_CODE.exec(withoutCountry);

  if (!match) {
    return {
      "@type": "PostalAddress",
      streetAddress: withoutCountry.replace(/[,\s]+$/, ""),
      addressCountry: "IT",
    };
  }

  const street = withoutCountry.slice(0, match.index).replace(/[,\s]+$/, "");
  const tail = withoutCountry.slice(match.index + match[1].length).trim();

  // "Roma RM" / "Lido di Ostia, Roma RM" -> region RM, locality "Lido di Ostia".
  const regionMatch = /\b([A-Z]{2})\s*$/.exec(tail);
  const withoutRegion = (regionMatch ? tail.slice(0, regionMatch.index) : tail)
    .replace(/[,\s]+$/, "")
    .trim();
  const locality = withoutRegion.split(",")[0]?.trim();

  return compact<PostalAddress>({
    "@type": "PostalAddress",
    streetAddress: street,
    addressLocality: locality,
    addressRegion: regionMatch?.[1],
    postalCode: match[1],
    addressCountry: "IT",
  });
}

/**
 * `openingHoursSpecification` is deliberately absent — the registry has no
 * opening hours and invented ones would be worse than none.
 */
export function buildMovieTheater(cinema: CinemaConfig): MovieTheater {
  return compact<MovieTheater>({
    "@type": "MovieTheater",
    "@id": cinemaNodeId(cinema.id),
    url: cinemaUrl(cinema.id),
    name: cinema.name,
    address: parseAddress(cinema.address),
    geo: cinema.coordinates
      ? {
          "@type": "GeoCoordinates",
          latitude: cinema.coordinates.lat,
          longitude: cinema.coordinates.lng,
        }
      : undefined,
    sameAs: clean(cinema.website) ? [cinema.website] : undefined,
    publicAccess: true,
  });
}
