"use client";

import { LoaderCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "mono-label inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-primary text-primaryForeground hover:bg-primary/92",
        variant === "secondary" &&
          "bg-transparent text-foreground ring-1 ring-line hover:bg-surface",
        variant === "ghost" &&
          "bg-transparent text-mutedForeground hover:bg-surface hover:text-foreground",
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
