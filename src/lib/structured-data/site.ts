import { BASE_URL, ORGANIZATION_ID, SITE_NAME, WEBSITE_ID } from "./constants.ts";
import { compact } from "./serialize.ts";
import type { Organization, WebSite } from "./schema-types.ts";

const DESCRIPTION = "Orari e programmazione dei cinema di Roma.";

/**
 * The `q` search param on the homepage is a real, working query endpoint, so
 * `SearchAction` describes something that actually exists.
 */
export function buildWebSite(): WebSite {
  return compact<WebSite>({
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${BASE_URL}/`,
    name: SITE_NAME,
    description: DESCRIPTION,
    inLanguage: ["it", "en"],
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

/**
 * `logo` is intentionally absent: the site has no dedicated logo asset yet
 * (only `app/favicon.ico`), and Google's Organization logo guidance wants a
 * real raster/SVG image. Drop a file in `public/` and pass it here to add it.
 */
export function buildOrganization(logoUrl?: string): Organization {
  return compact<Organization>({
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    url: `${BASE_URL}/`,
    name: SITE_NAME,
    description: DESCRIPTION,
    logo: logoUrl,
    // No Felinoir-owned social profiles exist. The LinkedIn profile below
    // belongs to the creator, so it hangs off `founder`, not the organisation.
    founder: {
      "@type": "Person",
      name: "Alessandro Rossi",
      sameAs: ["https://www.linkedin.com/in/alessandro-rossi-448294205/"],
    },
  });
}
