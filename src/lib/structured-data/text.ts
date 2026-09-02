const PLACEHOLDERS = new Set(["n/a", "na", "unknown", "-", "—", "null", "undefined"]);

function isPlaceholder(value: string): boolean {
  return PLACEHOLDERS.has(value.toLowerCase());
}

/** Cleans a scalar field, treating OMDb/TMDB placeholders as missing. */
export function clean(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (trimmed === "" || isPlaceholder(trimmed)) return undefined;
  return trimmed;
}

/**
 * Splits a comma-separated backend field ("Bill Pullman, Patricia Arquette")
 * into de-duplicated, placeholder-free entries.
 */
export function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(",")) {
    const item = clean(raw);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** De-duplicates while preserving order, dropping empties and placeholders. */
export function uniqueStrings(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const item = clean(value);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
