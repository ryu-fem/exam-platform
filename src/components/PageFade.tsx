"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Replays a lightweight fade-in whenever the route changes. Keyed by the
 * (locale-free) pathname so navigation re-triggers the animation without
 * remounting on language switches.
 */
export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="flex w-full flex-1 flex-col animate-page-fade">
      {children}
    </div>
  );
}