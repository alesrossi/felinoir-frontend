"use client";

import { useLang } from "@/lib/lang";
import { Button } from "@/components/ui/button";

export function LangToggle() {
  const { locale, toggleLocale } = useLang();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      aria-label={locale === "en" ? "Switch to Italian" : "Passa all'inglese"}
      className="font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground"
    >
      {locale === "en" ? "IT" : "EN"}
    </Button>
  );
}
