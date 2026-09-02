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
 * The canonical path for a film. Mirrors how the app links to films
 * (`slug` when the backend has one, numeric id otherwise) and how
 * `app/sitemap.ts` builds its entries, so `@id` matches the indexed URL.
 */
export function moviePath(movie: { id: number; slug?: string }): string {
  return `/movies/${movie.slug ?? movie.id}`;
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
