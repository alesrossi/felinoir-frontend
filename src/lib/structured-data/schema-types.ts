// Minimal typed subset of schema.org, covering only the properties this site
// actually emits. Every optional property is genuinely optional: builders omit
// it rather than emitting `null` or `""`.

export type SchemaContext = "https://schema.org";

/** A bare `{ "@id": ... }` pointer to a node described on another page. */
export interface NodeRef {
  "@id": string;
}

export interface WithContext {
  "@context": SchemaContext;
}

export interface Graph extends WithContext {
  "@graph": SchemaNode[];
}

export interface Person {
  "@type": "Person";
  name: string;
  sameAs?: string[];
}

export interface Country {
  "@type": "Country";
  name: string;
}

export interface PostalAddress {
  "@type": "PostalAddress";
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
}

export interface GeoCoordinates {
  "@type": "GeoCoordinates";
  latitude: number;
  longitude: number;
}

export interface SearchAction {
  "@type": "SearchAction";
  target: {
    "@type": "EntryPoint";
    urlTemplate: string;
  };
  "query-input": string;
}

export interface WebSite {
  "@type": "WebSite";
  "@id": string;
  url: string;
  name: string;
  description?: string;
  inLanguage?: string[];
  publisher?: NodeRef;
  potentialAction?: SearchAction;
}

export interface Organization {
  "@type": "Organization";
  "@id": string;
  url: string;
  name: string;
  description?: string;
  logo?: string;
  sameAs?: string[];
  founder?: Person;
}

export interface Movie {
  "@type": "Movie";
  "@id": string;
  url: string;
  name: string;
  alternateName?: string[];
  image?: string;
  description?: string;
  datePublished?: string;
  dateCreated?: string;
  duration?: string;
  inLanguage?: string;
  genre?: string[];
  director?: Person[];
  actor?: Person[];
  countryOfOrigin?: Country[];
  sameAs?: string[];
}

export type VideoFormat = "2D" | "3D" | "IMAX" | "4DX";

export interface ScreeningEvent {
  "@type": "ScreeningEvent";
  "@id": string;
  name: string;
  startDate: string;
  endDate?: string;
  eventStatus: "https://schema.org/EventScheduled";
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode";
  workPresented: NodeRef;
  location: NodeRef;
  videoFormat?: VideoFormat;
  inLanguage?: string;
  subtitleLanguage?: string;
  url?: string;
}

export interface MovieTheater {
  "@type": "MovieTheater";
  "@id": string;
  url: string;
  name: string;
  address?: PostalAddress;
  geo?: GeoCoordinates;
  sameAs?: string[];
  publicAccess?: boolean;
}

export interface ListItem {
  "@type": "ListItem";
  position: number;
  name: string;
  url?: string;
  item?: string;
}

export interface ItemList {
  "@type": "ItemList";
  "@id"?: string;
  name: string;
  itemListOrder: "https://schema.org/ItemListOrderAscending";
  numberOfItems: number;
  itemListElement: ListItem[];
}

export interface BreadcrumbList {
  "@type": "BreadcrumbList";
  "@id"?: string;
  itemListElement: ListItem[];
}

export type SchemaNode =
  | WebSite
  | Organization
  | Movie
  | ScreeningEvent
  | MovieTheater
  | ItemList
  | BreadcrumbList;
