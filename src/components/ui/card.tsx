import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Kart yüzeyi. `interactive` yalnızca tıklanabilir kartlarda kullanılmalı —
 * statik panellerde hover aydınlanması yanıltıcı olur.
 */
function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "surface-card flex flex-col",
        interactive && "surface-card-interactive",
        className,
      )}
      {...props}
    />
  );
}

/** Grid sayesinde `CardAction` başlık ve açıklamanın sağına, iki satırı da
 *  kapsayacak şekilde hizalanır. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 px-5 pt-5",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-[15px] font-semibold leading-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-[13px] leading-relaxed text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex shrink-0 items-center gap-1 self-start",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex-1 px-5 py-5", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-3 border-t border-hairline px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
};
