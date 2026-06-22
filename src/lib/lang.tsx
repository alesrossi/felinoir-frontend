"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { translations, type Locale, type T } from "./translations";

const LOCALE_KEY = "cinema-locale";

interface LangContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: T;
  toggleLocale: () => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // Server and initial client render both use "it" — no hydration mismatch.
  const [locale, setLocaleState] = useState<Locale>("it");
  // Becomes true only after the first effect has read localStorage and applied any saved locale.
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      if (saved === "en" || saved === "it") setLocaleState(saved);
    } catch {}
    // React 18+ batches this with the setLocaleState above into a single re-render,
    // so the [initialized] effect below fires only after the correct locale is painted.
    setInitialized(true);
  }, []);

  // Lift the visibility:hidden on the page only after the correct locale is rendered.
  useEffect(() => {
    if (initialized) document.documentElement.setAttribute("data-ready", "");
  }, [initialized]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(LOCALE_KEY, l); } catch {}
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "it" : "en");
  }, [locale, setLocale]);

  return (
    <LangContext.Provider
      value={{ locale, setLocale, t: translations[locale], toggleLocale }}
    >
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
