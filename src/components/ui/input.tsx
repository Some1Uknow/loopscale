import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-11 w-full rounded-lg border border-line bg-card px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-mutedForeground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
