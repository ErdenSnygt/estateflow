import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-lg border border-hairline bg-surface-inset px-4 py-2 text-sm text-foreground",
        "transition-colors duration-200 ease-[var(--ease-out-quint)]",
        "placeholder:text-muted-foreground",
        "hover:border-hairline-strong",
        "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
