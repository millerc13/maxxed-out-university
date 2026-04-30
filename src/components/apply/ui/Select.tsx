"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-12 w-full items-center gap-3 rounded-md bg-white border border-border-strong px-4",
      "text-[15px] text-text-dark data-[placeholder]:text-text-muted",
      "transition-colors duration-200",
      "focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none",
      "active:bg-maxxed-blue/5 cursor-pointer select-none",
      "[font-size:15px] [@supports(-webkit-touch-callout:none)]:[font-size:16px]",
      className
    )}
    {...props}
  >
    <span className="flex-1 min-w-0 text-left truncate">{children}</span>
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={6}
      collisionPadding={12}
      className={cn(
        "z-50 w-[var(--radix-select-trigger-width)]",
        "max-h-[min(320px,var(--radix-select-content-available-height))]",
        "overflow-hidden rounded-md border border-border-strong bg-white",
        "shadow-[0_15px_40px_rgba(0,0,0,0.12)]",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1.5">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full min-h-11 cursor-pointer select-none items-center rounded-sm py-3 pl-9 pr-3",
      "text-[15px] text-text-dark leading-tight",
      "focus:bg-maxxed-blue/10 focus:outline-none",
      "active:bg-maxxed-blue/15",
      "data-[state=checked]:text-maxxed-blue data-[state=checked]:font-semibold data-[state=checked]:bg-maxxed-blue/5",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" strokeWidth={3} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
