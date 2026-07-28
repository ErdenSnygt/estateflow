import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-hairline bg-surface-inset px-4 py-3 text-sm text-foreground",
        "transition-colors duration-200 ease-[var(--ease-out-quint)]",
        "placeholder:text-muted-foreground",
        "hover:border-hairline-strong",
        "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
