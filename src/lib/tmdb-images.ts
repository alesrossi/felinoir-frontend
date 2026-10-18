/**
 * Pick a wide still from TMDb's backdrop list (the raw JSON string stored on
 * the movie): textless backdrops first, so no baked-in logo fights our own
 * title, then the most-voted one.
 */
export function pickBackdropUrl(raw: string | undefined, size: "w780" | "w1280" = "w1280"): string | undefined {
  if (!raw) return undefined;
  try {
    const list: { file_path?: string; iso_639_1?: string | null; vote_count?: number }[] = JSON.parse(raw);
    const best = list
      .filter(b => b.file_path)
      .sort((a, b) =>
        Number(a.iso_639_1 != null) - Number(b.iso_639_1 != null) ||
        (b.vote_count ?? 0) - (a.vote_count ?? 0))[0];
    return best ? `https://image.tmdb.org/t/p/${size}${best.file_path}` : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Credits — the scraper's `tmdbCredits` JSON blob, with photo URLs resolved
// ---------------------------------------------------------------------------

export interface CreditPerson {
  id: number;
  name: string;
  photoUrl?: string;
  /** Character for cast; jobs ("Screenplay", "Novel"…) for writers. */
  role?: string;
  jobs?: string[];
}

export interface MovieCredits {
  directors: CreditPerson[];
  writers: CreditPerson[];
  cast: CreditPerson[];
  composers: CreditPerson[];
  cinematographers: CreditPerson[];
}

type RawPerson = { id?: number; name?: string; profile_path?: string | null; character?: string; jobs?: string[] };

function toPerson(p: RawPerson): CreditPerson | null {
  if (!p?.name) return null;
  return {
    id: p.id ?? 0,
    name: p.name,
    photoUrl: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : undefined,
    role: p.character || undefined,
    jobs: Array.isArray(p.jobs) && p.jobs.length ? p.jobs : undefined,
  };
}

export function parseCredits(raw: string | undefined): MovieCredits | undefined {
  if (!raw) return undefined;
  try {
    const c = JSON.parse(raw) as Partial<Record<keyof MovieCredits, RawPerson[]>>;
    const list = (k: keyof MovieCredits) =>
      (Array.isArray(c[k]) ? c[k]! : []).map(toPerson).filter((p): p is CreditPerson => p !== null);
    return {
      directors: list("directors"),
      writers: list("writers"),
      cast: list("cast"),
      composers: list("composers"),
      cinematographers: list("cinematographers"),
    };
  } catch {
    return undefined;
  }
}

/** ISO 3166 codes from `tmdbProductionCountries`, e.g. ["US", "GB"]. */
export function parseCountryCodes(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const list: { iso_3166_1?: string }[] = JSON.parse(raw);
    return list.map((c) => c.iso_3166_1).filter((c): c is string => !!c);
  } catch {
    return [];
  }
}

/** Company names from `tmdbProductionCompanies`, in TMDb's order. */
export function parseCompanyNames(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const list: { name?: string }[] = JSON.parse(raw);
    return list.map((c) => c.name).filter((n): n is string => !!n);
  } catch {
    return [];
  }
}
