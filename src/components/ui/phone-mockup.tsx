import * as React from "react";
import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  children?: React.ReactNode;
  className?: string;
  screenClassName?: string;
  /** Aspect ratio of the screen area. Defaults to "9/19.5" (modern smartphone). */
  aspectRatio?: string;
}

export function PhoneMockup({
  children,
  className,
  screenClassName,
  aspectRatio = "9/19.5",
}: PhoneMockupProps) {
  return (
    <div
      className={cn(
        // Phone shell
        "relative mx-auto flex flex-col items-center",
        "w-[280px] rounded-[2.5rem] border-[6px] border-navy-700 bg-navy-900 shadow-[0_0_0_1px_hsl(var(--border)),0_24px_64px_-12px_rgba(0,0,0,0.7)]",
        className
      )}
    >
      {/* Top notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-[18px] rounded-full bg-navy-950 z-10" />

      {/* Side buttons */}
      <div className="absolute -right-[9px] top-24 w-[5px] h-12 rounded-r-full bg-navy-700" />
      <div className="absolute -left-[9px] top-20 w-[5px] h-8 rounded-l-full bg-navy-700" />
      <div className="absolute -left-[9px] top-32 w-[5px] h-8 rounded-l-full bg-navy-700" />

      {/* Screen */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-[2rem] bg-navy-950",
          screenClassName
        )}
        style={{ aspectRatio }}
      >
        {children}
      </div>

      {/* Home indicator */}
      <div className="my-2 w-24 h-1 rounded-full bg-navy-600" />
    </div>
  );
}
