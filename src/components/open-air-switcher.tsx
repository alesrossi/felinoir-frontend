"use client";

import { useEffect, useState } from "react";
import { Trees } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/lang";
import {
  loadStoredOpenAir,
  saveOpenAir,
  OPEN_AIR_EVENT,
  GLOBAL_FILTER_EVENT,
} from "@/components/global-filter-fab";

const STORAGE_KEY = "cinema-filters";

function loadStoredCinemaSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return new Set((data.cinemas ?? "").split(",").filter(Boolean));
  } catch { return new Set(); }
}

function saveCinemaSet(ids: Set<string>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (ids.size > 0) data.cinemas = [...ids].join(",");
    else delete data.cinemas;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT));
  } catch {}
}

interface OpenAirSwitcherProps {
  openAirIds: string[];
}

export function OpenAirSwitcher({ openAirIds }: OpenAirSwitcherProps) {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(loadStoredOpenAir());
    setMounted(true);
  }, []);

  useEffect(() => {
    function onChanged() { setActive(loadStoredOpenAir()); }
    window.addEventListener(OPEN_AIR_EVENT, onChanged);
    return () => window.removeEventListener(OPEN_AIR_EVENT, onChanged);
  }, []);

  function toggle() {
    const next = !active;
    setActive(next);
    saveOpenAir(next);

    // Add / remove all open-air cinema IDs from the cinema filter
    const current = loadStoredCinemaSet();
    if (next) {
      openAirIds.forEach(id => current.add(id));
    } else {
      openAirIds.forEach(id => current.delete(id));
    }
    saveCinemaSet(current);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground whitespace-nowrap sm:hidden">
        {t.home.discoverOpenAirShort}
      </span>
      <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground whitespace-nowrap hidden sm:inline">
        {t.home.discoverOpenAir}
      </span>
      <button
        onClick={toggle}
        aria-label={t.home.discoverOpenAir}
        aria-pressed={active}
        className={cn(
          "relative flex items-center w-11 h-6 rounded-full border transition-all duration-200",
          active
            ? "bg-green-900/40 border-green-700/60 hover:bg-green-900/50 hover:border-green-700/80"
            : "bg-foreground/10 border-foreground/20 hover:bg-foreground/15"
        )}
      >
        <span
          className={cn(
            "absolute flex items-center justify-center size-[18px] rounded-full transition-transform duration-200",
            active
              ? "translate-x-6 bg-green-700"
              : "translate-x-0.5 bg-foreground/40"
          )}
        >
          {mounted && <Trees className={cn("size-3", active ? "text-white" : "text-background")} />}
        </span>
      </button>
    </div>
  );
}
