import { ShieldX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

/**
 * Personeller modülünün yetkisiz görünümü.
 *
 * YÖNLENDİRME YERİNE SAYFA: `/personeller`e tıklayan bir danışmanı sessizce
 * dashboard'a atmak "bağlantı bozuk" hissi verir — kullanıcı ne olduğunu
 * anlamaz ve tekrar dener. Açık bir cevap hem dürüst hem de daha kısa yol.
 *
 * Menü öğesi gizlenmiyor: ekipte böyle bir modülün VAR olduğunu bilmek,
 * gerektiğinde yöneticiden istemeyi mümkün kılıyor. Gizli menü, keşfedilmemiş
 * yetki demek.
 */
export function StaffGuard() {
  return (
    <EmptyState
      icon={ShieldX}
      badge="Yetki gerekiyor"
      title="Bu sayfayı görüntüleme yetkiniz yok"
      description="Personel listesi ve performans bilgileri yalnızca patron ve ofis müdürü rolündeki kullanıcılara açıktır. Erişim gerekiyorsa ofis yöneticinizle görüşün."
    />
  );
}
