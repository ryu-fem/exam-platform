"use client";

import { useMemo } from "react";

type Dot = {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
};

/**
 * Deterministic pseudo-random dots so the server-rendered markup matches the
 * client (no hydration mismatches from Math.random).
 */
function generateDots(count: number): Dot[] {
  const dots: Dot[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i += 1) {
    dots.push({
      x: Math.round(rand() * 100),
      y: Math.round(rand() * 100),
      size: 2 + rand() * 4,
      duration: 16 + rand() * 12,
      delay: rand() * 8,
    });
  }
  return dots;
}

/**
 * Subtle black & white floating-dot background for the auth screens.
 * Dots use `--foreground` (black in light mode, white in dark mode) at a low
 * opacity and drift very slowly, behind the auth card.
 */
export function AnimatedBackground() {
  const dots = useMemo(() => generateDots(26), []);

  return (
    <div
      aria-hidden
      data-auth-bg
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {dots.map((dot, i) => (
        <span
          key={i}
          className="absolute rounded-full opacity-[0.12] dark:opacity-[0.18]"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            backgroundColor: "var(--foreground)",
            animation: `bw-float ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}