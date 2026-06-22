"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface OrbitalItem {
  id: string;
  /** Short label shown on the orbit node */
  label: string;
  /** Icon component or emoji string */
  icon?: React.ReactNode;
  /** Longer description shown in the centre when this item is active */
  description?: string;
  /** Tailwind colour for the glow / active ring (e.g. "cyan", "blue") */
  color?: string;
}

interface RadialOrbitalTimelineProps {
  items: OrbitalItem[];
  /** Diameter of the orbit ring in px. Default 320 */
  orbitRadius?: number;
  /** Whether the ring auto-rotates. Default true */
  autoRotate?: boolean;
  /** Rotation speed in seconds per full revolution. Default 20 */
  rotateDuration?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function RadialOrbitalTimeline({
  items,
  orbitRadius = 160,
  autoRotate = true,
  rotateDuration = 20,
  className,
}: RadialOrbitalTimelineProps) {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = React.useState<string>(items[0]?.id ?? "");

  const size = (orbitRadius + 60) * 2; // SVG viewBox dimension
  const cx = size / 2;
  const cy = size / 2;

  const activeItem = items.find((i) => i.id === activeId) ?? items[0];

  /* Variants */
  const ringVariants: Variants = {
    spin: {
      rotate: 360,
      transition: {
        duration: rotateDuration,
        ease: "linear",
        repeat: Infinity,
      },
    },
    still: { rotate: 0 },
  };

  const nodeVariants: Variants = {
    idle: { scale: 1, opacity: 0.7 },
    active: { scale: 1.15, opacity: 1 },
  };

  const descVariants: Variants = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center select-none",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Centre info */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-8 text-center"
        style={{ maxWidth: orbitRadius * 1.1, margin: "0 auto" }}
      >
        {activeItem && (
          <motion.div
            key={activeItem.id}
            variants={descVariants}
            initial="hidden"
            animate="visible"
          >
            {activeItem.icon && (
              <div className="text-4xl mb-2">{activeItem.icon}</div>
            )}
            <p className="text-sm font-semibold text-foreground">
              {activeItem.label}
            </p>
            {activeItem.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {activeItem.description}
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* SVG ring + nodes */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        {/* Orbit circle */}
        <circle
          cx={cx}
          cy={cy}
          r={orbitRadius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1.5}
          strokeDasharray="4 6"
        />

        {/* Rotating group */}
        <motion.g
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
          variants={ringVariants}
          animate={autoRotate && !reduceMotion ? "spin" : "still"}
        >
          {items.map((item, i) => {
            const angleDeg = (360 / items.length) * i;
            const pos = polarToCartesian(cx, cy, orbitRadius, angleDeg);
            const isActive = item.id === activeId;

            return (
              <motion.g
                key={item.id}
                style={{ originX: `${pos.x}px`, originY: `${pos.y}px` }}
                variants={nodeVariants}
                animate={isActive ? "active" : "idle"}
              >
                {/* Counter-rotate so node label stays upright */}
                <motion.g
                  style={{ originX: `${pos.x}px`, originY: `${pos.y}px` }}
                  animate={
                    autoRotate && !reduceMotion
                      ? {
                          rotate: -360,
                          transition: {
                            duration: rotateDuration,
                            ease: "linear",
                            repeat: Infinity,
                          },
                        }
                      : { rotate: 0 }
                  }
                >
                  {/* Glow ring when active */}
                  {isActive && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={18}
                      fill="hsl(var(--accent)/0.15)"
                      stroke="hsl(var(--accent))"
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={13}
                    fill={
                      isActive
                        ? "hsl(var(--accent))"
                        : "hsl(var(--card))"
                    }
                    stroke={
                      isActive
                        ? "hsl(var(--accent))"
                        : "hsl(var(--border))"
                    }
                    strokeWidth={1.5}
                    className="cursor-pointer"
                    onClick={() => setActiveId(item.id)}
                  />

                  {/* Label */}
                  <text
                    x={pos.x}
                    y={pos.y + 28}
                    textAnchor="middle"
                    className="cursor-pointer"
                    fill={
                      isActive
                        ? "hsl(var(--accent))"
                        : "hsl(var(--muted-foreground))"
                    }
                    fontSize={10}
                    fontFamily="var(--font-geist-sans), sans-serif"
                    fontWeight={isActive ? 600 : 400}
                    onClick={() => setActiveId(item.id)}
                  >
                    {item.label}
                  </text>
                </motion.g>
              </motion.g>
            );
          })}
        </motion.g>
      </svg>
    </div>
  );
}
