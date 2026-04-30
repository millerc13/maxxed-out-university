"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full h-12 rounded-md bg-white border border-border-strong px-4 text-[15px] text-text-dark placeholder:text-text-muted",
        "transition-colors duration-200 focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-md bg-white border border-border-strong px-4 py-3 text-[15px] text-text-dark placeholder:text-text-muted",
        "transition-colors duration-200 focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none resize-y",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({
  children,
  className,
  required,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      {...props}
      className={cn(
        "block text-[11px] md:text-xs font-extrabold tracking-[0.2em] uppercase text-text-dark mb-2.5",
        className
      )}
    >
      {children}
      {required && <span className="text-maxxed-blue ml-1">*</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-600 mt-1.5 font-medium">
      {message}
    </p>
  );
}
