"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

type Shape = {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
};

/**
 * Deterministic pseudo-random shapes so server-rendered markup matches the
 * client (no hydration mismatches from Math.random).
 */
function generate(
  seedStart: number,
  count: number,
  minSize: number,
  maxSize: number,
  minDuration: number,
  maxDuration: number,
): Shape[] {
  let seed = seedStart;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, () => ({
    x: Math.round(rand() * 100),
    y: Math.round(rand() * 100),
    size: Math.round(minSize + rand() * (maxSize - minSize)),
    duration: Math.round(minDuration + rand() * (maxDuration - minDuration)),
    delay: Math.round(rand() * 10),
  }));
}

/**
 * Editorial black & white background for the hero: a slow mesh of thin
 * outlined circles plus a faint drifting dot grid. Transform-only animations,
 * 5% opacity in light mode / 8% in dark, and fewer elements on small screens.
 * Hidden entirely when the user prefers reduced motion (see globals.css).
 */
export function LandingBackground() {
  const rings = useMemo(() => generate(19, 5, 180, 420, 34, 58), []);
  const dots = useMemo(() => generate(7, 30, 1, 3, 24, 40), []);

  return (
    <div
      aria-hidden
      data-landing-bg
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {rings.map((ring, index) => (
        <span
          key={`ring-${index}`}
          className={cn(
            "absolute rounded-full border border-foreground opacity-[0.05] dark:opacity-[0.08]",
            index >= 3 && "hidden sm:block",
          )}
          style={{
            left: `${ring.x}%`,
            top: `${ring.y}%`,
            width: `${ring.size}px`,
            height: `${ring.size}px`,
            animation: `bw-drift ${ring.duration}s ease-in-out ${ring.delay}s infinite`,
          }}
        />
      ))}
      {dots.map((dot, index) => (
        <span
          key={`dot-${index}`}
          className={cn(
            "absolute rounded-full bg-foreground opacity-[0.05] dark:opacity-[0.08]",
            index >= 14 && "hidden sm:block",
          )}
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            animation: `bw-float ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}