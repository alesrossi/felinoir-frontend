"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/lang";

export function CinemasBackLink() {
  const { t } = useLang();
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-roman-muted transition-colors"
    >
      <ArrowLeft className="size-4" />
      {t.movie.back}
    </Link>
  );
}
