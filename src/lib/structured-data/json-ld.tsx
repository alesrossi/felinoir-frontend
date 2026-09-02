import { serializeJsonLd } from "./serialize.ts";
import type { Graph, SchemaNode } from "./schema-types.ts";

/**
 * Renders JSON-LD into the server-rendered HTML. Must stay a server component:
 * client-side injection is not reliably seen by crawlers.
 */
export function JsonLd({ data }: { data: Graph | (SchemaNode & { "@context": "https://schema.org" }) }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

/** Wraps nodes in a single `@graph` document. */
export function graph(...nodes: (SchemaNode | null | undefined)[]): Graph {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter((n): n is SchemaNode => n != null),
  };
}
