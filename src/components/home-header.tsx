"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { homeHrefWithFilters } from "@/lib/home-href";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { OpenAirSwitcher } from "@/components/open-air-switcher";

export function HomeHeader({ openAirIds }: { openAirIds: string[] }) {
  const { t } = useLang();
  const router = useRouter();
  return (
    <header className="mb-8">
      <div className="flex h-14 items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-foreground/55">
          Roma
        </p>
        <div className="flex items-center gap-3">
          <OpenAirSwitcher openAirIds={openAirIds} />
          <ThemeSwitcher />
          <LangSwitcher />
        </div>
      </div>
      <h1 className="mt-4 font-serif text-5xl sm:text-6xl font-medium leading-[1.02] tracking-[-0.02em] text-foreground">
        {/* Links home like a logo, keeping the saved filters (see homeHrefWithFilters). */}
        <Link
          href="/"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab etc.
            e.preventDefault();
            router.push(homeHrefWithFilters());
          }}
          className="transition-colors hover:text-roman-muted"
        >
          {t.home.nowShowing}
        </Link>
      </h1>
    </header>
  );
}
