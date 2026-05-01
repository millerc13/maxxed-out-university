"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-extrabold uppercase tracking-[0.2em] whitespace-nowrap rounded-md transition-all duration-300 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 cursor-pointer active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-maxxed-blue text-white hover:bg-maxxed-blue-dark hover:-translate-y-0.5 shadow-[0_4px_14px_rgba(0,0,255,0.25)] hover:shadow-[0_8px_22px_rgba(0,0,255,0.35)]",
        outline:
          "border-2 border-maxxed-blue text-maxxed-blue bg-white hover:bg-maxxed-blue hover:text-white",
        outlineWhite:
          "border-2 border-white text-white bg-transparent hover:bg-white hover:text-maxxed-blue",
        dark:
          "bg-maxxed-dark text-white hover:bg-maxxed-dark-section hover:-translate-y-0.5",
        ghost:
          "text-text-body hover:text-maxxed-blue",
      },
      size: {
        sm: "h-10 px-5 text-[11px]",
        md: "h-12 px-7 text-xs",
        lg: "h-14 px-10 text-sm",
        xl: "h-16 px-12 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
