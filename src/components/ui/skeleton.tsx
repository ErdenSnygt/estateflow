import { cn } from "@/lib/utils";

/**
 * Yükleme yer tutucusu. Gerçek içeriğin ölçüsüne yakın kutular kullanın —
 * iskelet ile içerik arasında boyut farkı olursa sayfa zıplar.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-surface-hover", className)}
      {...props}
    />
  );
}

export { Skeleton };
