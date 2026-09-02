// Canonical identifiers shared by every schema.org node we emit.
//
// Entities are keyed by absolute URL + fragment so that a node referenced from
// one page (e.g. a cinema referenced by a screening on a film page) resolves to
// the same node that is fully described on its own page.

export const BASE_URL = "https://felinoir.it";
export const SITE_NAME = "Felinoir";

export const WEBSITE_ID = `${BASE_URL}/#website`;
export const ORGANIZATION_ID = `${BASE_URL}/#organization`;

/** Turns a site-relative path into an absolute URL; passes through absolute ones. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * A backend slug is only usable in a URL when it survives the round trip:
 * `/movies/[id]` routes an all-digit segment to the id lookup, so a numeric
 * slug would resolve to the wrong film. Degenerate slugs also reach us — the
 * backend derives them from the title with an ASCII-only transform, so a title
 * written in a non-Latin script collapses to nothing and leaves just the year
 * ("Il terzo omicidio" → `-2017`). Those get dropped in favour of the id.
 */
export function isUsableSlug(slug: string | undefined): slug is string {
  return !!slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !/^\d+$/.test(slug);
}

/**
 * The canonical path for a film, and the single place that decides it. Mirrors
 * how the app links to films (`slug` when the backend has a usable one, numeric
 * id otherwise) and how `app/sitemap.ts` builds its entries, so `@id` matches
 * the indexed URL.
 */
export function moviePath(movie: { id: number; slug?: string }): string {
  return `/movies/${isUsableSlug(movie.slug) ? movie.slug : movie.id}`;
}

export function movieUrl(movie: { id: number; slug?: string }): string {
  return `${BASE_URL}${moviePath(movie)}`;
}

export function movieNodeId(movie: { id: number; slug?: string }): string {
  return `${movieUrl(movie)}#film`;
}

export function cinemaUrl(cinemaId: string): string {
  return `${BASE_URL}/cinemas/${cinemaId}`;
}

export function cinemaNodeId(cinemaId: string): string {
  return `${cinemaUrl(cinemaId)}#theater`;
}
