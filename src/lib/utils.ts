import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const LANG_TO_COUNTRY: Record<string, string> = {
  af: "ZA", am: "ET", ar: "SA", az: "AZ", be: "BY", bg: "BG", bn: "BD",
  bs: "BA", ca: "ES", cs: "CZ", cy: "GB", da: "DK", de: "DE", el: "GR",
  en: "GB", es: "ES", et: "EE", eu: "ES", fa: "IR", fi: "FI", fr: "FR",
  ga: "IE", gl: "ES", gu: "IN", he: "IL", hi: "IN", hr: "HR", hu: "HU",
  hy: "AM", id: "ID", is: "IS", it: "IT", ja: "JP", ka: "GE", kk: "KZ",
  km: "KH", kn: "IN", ko: "KR", lt: "LT", lv: "LV", mk: "MK", ml: "IN",
  mn: "MN", mr: "IN", ms: "MY", my: "MM", nb: "NO", ne: "NP", nl: "NL",
  no: "NO", pa: "IN", pl: "PL", ps: "AF", pt: "PT", ro: "RO", ru: "RU",
  si: "LK", sk: "SK", sl: "SI", sq: "AL", sr: "RS", sv: "SE", sw: "KE",
  ta: "IN", te: "IN", th: "TH", tl: "PH", tr: "TR", uk: "UA", ur: "PK",
  uz: "UZ", vi: "VN", zh: "CN", zu: "ZA",
};

export function languageToFlag(langCode: string): string {
  const country = LANG_TO_COUNTRY[langCode.toLowerCase()];
  if (!country) return langCode.toUpperCase();
  return [...country].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a Google Maps URL that opens the native maps app on mobile
 * and Google Maps in the browser on desktop.
 * Prefers coordinates (more precise) over address string.
 */
export function mapsUrl(
  address: string,
  coords?: { lat: number; lng: number },
): string {
  if (coords) return `https://maps.google.com/?q=${coords.lat},${coords.lng}`;
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}
