"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/cn";

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn("grid gap-3", className)}
    {...props}
  />
));
RadioGroup.displayName = "RadioGroup";

export type RadioCardProps = {
  value: string;
  label: string;
  description?: string;
  className?: string;
};

export const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioCardProps
>(({ value, label, description, className }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    value={value}
    className={cn(
      "group relative flex items-start gap-3 rounded-md border border-border-strong bg-white p-4 text-left transition-all duration-200",
      "hover:border-maxxed-blue/50",
      "data-[state=checked]:border-maxxed-blue data-[state=checked]:bg-maxxed-blue/5 data-[state=checked]:shadow-[0_0_0_1px_rgba(0,0,255,0.3)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue cursor-pointer",
      className
    )}
  >
    <span
      aria-hidden
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong transition-all group-data-[state=checked]:border-maxxed-blue group-data-[state=checked]:bg-maxxed-blue"
    >
      <RadioGroupPrimitive.Indicator className="block h-2 w-2 rounded-full bg-white" />
    </span>
    <span className="flex flex-col">
      <span className="text-[14px] font-semibold text-text-dark">{label}</span>
      {description && (
        <span className="text-sm text-text-body mt-0.5">{description}</span>
      )}
    </span>
  </RadioGroupPrimitive.Item>
));
RadioCard.displayName = "RadioCard";
