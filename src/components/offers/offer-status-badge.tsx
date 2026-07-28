import type { OfferStatus } from "@/types/database";
import { OFFER_STATUS_LABELS, OFFER_STATUS_TONES } from "@/lib/offers";
import { Badge } from "@/components/ui/badge";

/** `ListingStatusBadge` / `CustomerStatusBadge` ile aynı desen. */
export function OfferStatusBadge({
  status,
  size = "sm",
}: {
  status: OfferStatus;
  size?: "sm" | "md";
}) {
  return (
    <Badge variant={OFFER_STATUS_TONES[status]} size={size}>
      {OFFER_STATUS_LABELS[status]}
    </Badge>
  );
}
