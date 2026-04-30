"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  current: number;
  total: number;
  labels: string[];
};

export function ProgressBar({ current, total, labels }: Props) {
  const pct = ((current - 1) / (total - 1)) * 100;

  return (
    <div className="w-full">
      <div className="hidden sm:grid grid-cols-4 gap-4 mb-5">
        {labels.map((label, idx) => {
          const n = idx + 1;
          const isComplete = n < current;
          const isActive = n === current;
          return (
            <div
              key={label}
              className={cn(
                "flex items-center gap-2 text-[10px] md:text-[11px] uppercase tracking-[0.18em] font-extrabold transition-colors",
                isActive
                  ? "text-maxxed-blue"
                  : isComplete
                    ? "text-text-dark"
                    : "text-text-muted"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold border-2 transition-all",
                  isActive
                    ? "bg-maxxed-blue text-white border-maxxed-blue"
                    : isComplete
                      ? "bg-maxxed-blue text-white border-maxxed-blue"
                      : "bg-white text-text-muted border-border-strong"
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
              </span>
              <span className="truncate">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="sm:hidden flex justify-between mb-3 text-[11px] uppercase tracking-[0.18em] font-extrabold">
        <span className="text-maxxed-blue">
          Step {current} of {total}
        </span>
        <span className="text-text-muted">{labels[current - 1]}</span>
      </div>

      <div className="relative h-1.5 w-full rounded-full bg-border overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 gradient-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
