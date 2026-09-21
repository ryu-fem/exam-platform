"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type FaqItem = {
  q: string;
  a: string;
};

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={index}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              className="flex w-full items-start justify-between gap-6 py-5 text-start transition-colors duration-200 ease-in-out hover:text-muted"
            >
              <span className="flex gap-4">
                <span className="pt-1 text-[11px] font-medium tabular-nums tracking-[0.2em] text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-semibold tracking-tight sm:text-lg">
                  {item.q}
                </span>
              </span>
              <ChevronDown
                className={`mt-1 h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-200 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-6 ps-9 text-sm leading-relaxed text-muted sm:text-base">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}