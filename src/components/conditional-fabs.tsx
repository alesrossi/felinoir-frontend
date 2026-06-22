"use client";

import { usePathname } from "next/navigation";
import { GlobalFilterFab } from "@/components/global-filter-fab";
import { CinemasFab } from "@/components/cinemas-fab";

interface Props {
  cinemas: { id: string; name: string; openAir: boolean }[];
}

export function ConditionalFabs({ cinemas }: Props) {
  const pathname = usePathname();
  if (pathname.startsWith("/felix")) return null;
  return (
    <>
      <GlobalFilterFab cinemas={cinemas} />
      <CinemasFab />
    </>
  );
}
