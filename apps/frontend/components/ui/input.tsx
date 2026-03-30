import type * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-none border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}
