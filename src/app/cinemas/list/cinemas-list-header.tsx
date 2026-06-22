"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/lang";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function CinemasListHeader() {
  const { t } = useLang();
  return (
    <>
      <div className="flex items-center justify-between mb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-roman-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t.movie.back}
        </Link>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <LangSwitcher />
        </div>
      </div>

      <header className="mb-8">
        <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-muted-foreground mb-3">
          Roma
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-light italic tracking-tight text-foreground leading-none mb-5">
          {t.cinema.title}
        </h1>
        <div className="h-px bg-border" />
      </header>
    </>
  );
}
