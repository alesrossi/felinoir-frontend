"use client";

import { useLang } from "@/lib/lang";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { OpenAirSwitcher } from "@/components/open-air-switcher";

export function HomeHeader({ openAirIds }: { openAirIds: string[] }) {
  const { t } = useLang();
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
        {t.home.nowShowing}
      </h1>
    </header>
  );
}
