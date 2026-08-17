import { useTranslations } from "next-intl";

import type { ListingStatus } from "@/types/database";
import { STATUS_TONES } from "@/lib/listings";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * `"use client"` YOK VE BU BİLİNÇLİ (Faz 26).
 *
 * Bileşen iki taraftan da çağrılıyor: sunucu bileşeni olan ilan kartı/satırı
 * ve detay sayfası, bir de istemci bileşeni olan `interest-card`. İşaret
 * konmadığında bileşen İKİSİNE DE uyuyor — sunucudan çağrıldığında sunucuda
 * çiziliyor (tarayıcıya hiç inmiyor), istemciden çağrıldığında o sayfanın
 * istemci parçasına giriyor. `next-intl`in `useTranslations` kancası her iki
 * bağlamda da çalışıyor; bu bileşenin başka bir istemci yeteneğine ihtiyacı
 * yok (durum yok, olay yok, efekt yok).
 *
 * Önce `"use client"` vardı ve `/ilanlar`, `/ilanlar/[id]`, `/musteriler`
 * paketlerine gereksiz yere giriyordu.
 */
export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  /* Etiket sözlükten (Faz 20); ton `lib/listings.ts` içinde kalıyor çünkü o
     bir tasarım kararı, metin değil. */
  const t = useTranslations("listings.status");

  return (
    <Badge variant={STATUS_TONES[status]} className={cn(className)}>
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-current opacity-80"
      />
      {t(status)}
    </Badge>
  );
}
