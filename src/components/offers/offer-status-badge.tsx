import { getTranslations } from "next-intl/server";

import type { OfferStatus } from "@/types/database";
import { OFFER_STATUS_TONES } from "@/lib/offers";
import { Badge } from "@/components/ui/badge";

/**
 * `ListingStatusBadge` / `CustomerStatusBadge` ile aynı desen.
 *
 * SUNUCU BİLEŞENİ: rozet her yerde bir listenin içinde ve etkileşimi yok.
 */
export async function OfferStatusBadge({
  status,
  size = "sm",
}: {
  status: OfferStatus;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("offers.status");

  return (
    <Badge variant={OFFER_STATUS_TONES[status]} size={size}>
      {t(status)}
    </Badge>
  );
}
