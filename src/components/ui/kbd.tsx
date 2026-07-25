import * as React from "react";

import { cn } from "@/lib/utils";

/** Klavye kısayolu rozeti — arama kutusu ve menülerde kullanılır. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] px-1.5",
        "border border-hairline-strong bg-surface-inset",
        "font-sans text-[10px] font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
