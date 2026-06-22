"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/lang";

interface CinemaPageNavProps {
  websiteUrl: string;
}

export function CinemaPageNav({ websiteUrl }: CinemaPageNavProps) {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-between mb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-roman-muted transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t.movie.back}
      </Link>
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-roman-muted hover:text-roman-muted/80 transition-colors"
      >
        {t.cinema.website}
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
