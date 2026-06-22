"use client";

import Link from "next/link";
import { Map, List } from "lucide-react";
import { usePathname } from "next/navigation";

export function CinemasFab() {
  const pathname = usePathname();
  const onMapPage = pathname === "/cinemas";

  return (
    <Link
      href={onMapPage ? "/cinemas/list" : "/cinemas"}
      aria-label={onMapPage ? "Cinema list" : "Cinema map"}
      className={[
        "flex items-center justify-center",
        "size-12 sm:size-16 rounded-full", 
        "bg-card border border-roman/40 shadow-lg",
        "text-roman hover:text-roman-muted hover:border-roman-muted",
        "transition-colors duration-200",
      ].join(" ")}
    >
      {onMapPage
        ? <List className="size-5 sm:size-7" />
        : <Map className="size-5 sm:size-7" />
      }
    </Link>
  );
}
