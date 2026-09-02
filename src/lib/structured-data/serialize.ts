/**
 * Recursively drops values that must never appear in the output: `null`,
 * `undefined`, empty/whitespace-only strings, empty arrays and objects that
 * ended up empty after pruning. `false` and `0` are preserved — they carry
 * meaning (e.g. `publicAccess: false`).
 */
function prune(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    const items = value.map(prune).filter((v) => v !== undefined);
    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      const pruned = prune(v);
      if (pruned !== undefined) out[key] = pruned;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  return undefined;
}

/** Returns a copy of `obj` with every empty/null field removed. */
export function compact<T extends object>(obj: T): T {
  return (prune(obj) ?? {}) as T;
}

/**
 * JSON for embedding in a `<script type="application/ld+json">` block.
 *
 * A synopsis containing `</script>` or `<!--` would otherwise terminate the
 * element and break the page, so `<` is escaped. U+2028/U+2029 are escaped for
 * consumers that evaluate the payload as JavaScript rather than JSON.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/[\u2028\u2029]/g, (c) => (c === "\u2028" ? "\\u2028" : "\\u2029"));
}
