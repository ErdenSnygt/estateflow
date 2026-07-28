import type { CustomerStatus } from "@/types/database";
import { CUSTOMER_STATUS_LABELS, CUSTOMER_STATUS_TONES } from "@/lib/customers";
import { Badge } from "@/components/ui/badge";

/** `ListingStatusBadge` ile aynı desen: eşleme sözlükte, bileşen ince. */
export function CustomerStatusBadge({
  status,
  size = "sm",
}: {
  status: CustomerStatus;
  size?: "sm" | "md";
}) {
  return (
    <Badge variant={CUSTOMER_STATUS_TONES[status]} size={size}>
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
}
