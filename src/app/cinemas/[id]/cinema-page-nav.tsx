"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/lang";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function CinemaPageNav() {
  const { t } = useLang();
  return (
    <div className="flex h-14 items-center justify-between">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-roman-muted active:scale-[0.97] transition"
      >
        <ArrowLeft className="size-4" />
        {t.movie.back}
      </Link>
      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <LangSwitcher />
      </div>
    </div>
  );
}

export function CinemaWebsiteButton({ websiteUrl }: { websiteUrl: string }) {
  const { t } = useLang();
  return (
    <a
      href={websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-roman inline-flex h-9 items-center gap-1.5 rounded-full pl-4 pr-3 text-sm font-medium active:scale-[0.97]"
    >
      {t.cinema.website}
      <ArrowUpRight className="size-3.5" />
    </a>
  );
}
