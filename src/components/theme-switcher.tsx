"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-11 h-6" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "relative flex items-center w-11 h-6 rounded-full border transition-all duration-200",
        isDark
          ? "bg-white/15 border-white/30 hover:bg-white/25 hover:border-white/50"
          : "bg-foreground/10 border-foreground/20 hover:bg-foreground/15"
      )}
    >
      <span
        className={cn(
          "absolute flex items-center justify-center size-[18px] rounded-full transition-transform duration-200",
          isDark
            ? "translate-x-0.5 bg-white/70"
            : "translate-x-6 bg-foreground/60"
        )}
      >
        {isDark
          ? <Moon className="size-3 text-background" />
          : <Sun className="size-3 text-background" />
        }
      </span>
    </button>
  );
}
