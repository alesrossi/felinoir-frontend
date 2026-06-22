"use client";

import { useLang } from "@/lib/lang";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { OpenAirSwitcher } from "@/components/open-air-switcher";
import FooterSection from "@/components/ui/footer";
import {Feather, Globe, Link as LinkIcon, MessageCircle, Send, Share2} from "lucide-react";
import { AskFelix } from "@/components/ask-felix";

const socialLinks = [
    { icon: Share2,        label: "Share" },
    { icon: MessageCircle, label: "Chat" },
    { icon: LinkIcon,      label: "Link" },
    { icon: Globe,         label: "Web" },
    { icon: Send,          label: "Send" },
    { icon: Feather,       label: "Feed" },
];

export function HomeHeader({ openAirIds }: { openAirIds: string[] }) {
  const { t } = useLang();
  return (
    <header className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-mono tracking-[0.3em] uppercase text-muted-foreground">
          Roma
        </p>
          
        <div className="flex items-center gap-3">
          <OpenAirSwitcher openAirIds={openAirIds} />
          <ThemeSwitcher />
          <LangSwitcher />
        </div>
      </div>
      <h1 className="font-serif text-5xl sm:text-6xl font-light italic tracking-tight text-foreground leading-none mb-5">
        {t.home.nowShowing}
      </h1>
      <AskFelix />
      <div className="h-px bg-border mt-6" />
    </header>
  );
}
