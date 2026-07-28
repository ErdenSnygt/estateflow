import type { ListingStatus } from "@/types/database";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/listings";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  return (
    <Badge variant={STATUS_TONES[status]} className={cn(className)}>
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-current opacity-80"
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
