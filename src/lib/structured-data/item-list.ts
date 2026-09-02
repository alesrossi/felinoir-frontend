import { absoluteUrl } from "./constants.ts";
import { compact } from "./serialize.ts";
import type { BreadcrumbList, ItemList, ListItem } from "./schema-types.ts";

/** Keeps list payloads small — sections stay well inside the page size budget. */
export const DEFAULT_MAX_LIST_ITEMS = 30;

export interface ListEntry {
  name: string;
  /** Site-relative path or absolute URL. */
  url: string;
}

/**
 * A section of a list page. Entries carry only `position`, `name` and `url` —
 * the full `Movie` object lives on the detail page it points at.
 */
export function buildItemList(options: {
  id?: string;
  name: string;
  entries: ListEntry[];
  maxItems?: number;
}): ItemList {
  const entries = options.entries.slice(0, options.maxItems ?? DEFAULT_MAX_LIST_ITEMS);
  return compact<ItemList>({
    "@type": "ItemList",
    "@id": options.id,
    name: options.name,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: entry.name,
      url: absoluteUrl(entry.url),
    })),
  });
}

export interface BreadcrumbEntry {
  name: string;
  /** Omitted on the final crumb, which is the current page. */
  url?: string;
}

export function buildBreadcrumbList(entries: BreadcrumbEntry[], id?: string): BreadcrumbList {
  return compact<BreadcrumbList>({
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: entries.map((entry, index) => {
      const item: ListItem = {
        "@type": "ListItem",
        position: index + 1,
        name: entry.name,
      };
      if (entry.url) item.item = absoluteUrl(entry.url);
      return item;
    }),
  });
}
