import { getTranslations } from "next-intl/server";

import type { CustomerStatus } from "@/types/database";
import { CUSTOMER_STATUS_TONES } from "@/lib/customers";
import { Badge } from "@/components/ui/badge";

/**
 * `ListingStatusBadge` ile aynı desen: eşleme sözlükte, bileşen ince.
 *
 * SUNUCU BİLEŞENİ. Rozet her yerde bir listenin içinde çiziliyor ve hiçbirinde
 * etkileşimi yok — `getTranslations()` yeterli, istemciye kod taşımıyor.
 */
export async function CustomerStatusBadge({
  status,
  size = "sm",
}: {
  status: CustomerStatus;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("customers.status");

  return (
    <Badge variant={CUSTOMER_STATUS_TONES[status]} size={size}>
      {t(status)}
    </Badge>
  );
}
