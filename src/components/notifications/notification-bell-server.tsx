import { getCurrentAgent } from "@/lib/auth/server";
import { getNotificationBellData } from "@/lib/data/notifications";
import { NotificationBell } from "@/components/notifications/notification-bell";

/**
 * Zilin sunucu tarafı.
 *
 * -----------------------------------------------------------------------------
 * NEDEN AYRI BİR DOSYA
 * -----------------------------------------------------------------------------
 * `AppShell` ve `Navbar` istemci bileşeni (sidebar durumu, medya sorgusu,
 * komut paleti hepsi tarayıcıda yaşıyor). Bildirim verisi ise sunucuda
 * çekiliyor. İkisini birleştirmenin iki yolu vardı:
 *
 *   1. Veriyi layout'tan `AppShell`e, oradan `Navbar`a prop olarak geçirmek —
 *      iki bileşeni de ilgilenmedikleri bir veriyle kirletir.
 *   2. Hazır çizilmiş bir sunucu bileşenini SLOT olarak geçirmek.
 *
 * İkincisi seçildi: `AppShell` yalnızca bir `React.ReactNode` görüyor, içinde
 * ne olduğunu bilmiyor. Bildirim sorgusu değiştiğinde kabuk kodu değişmiyor.
 *
 * Sorgular paralel; `getCurrentAgent()` zaten istek başına önbellekli
 * (`lib/auth/server.ts`), yani layout'ta ikinci kez ağa çıkmıyor.
 */
export async function NotificationBellServer() {
  /* İKİ SORGU, ÜÇ DEĞİL. Liste ve okunmamış sayısı tek çağrıdan geliyor
     (`getNotificationBellData`); ayrı bir sayım sorgusu her sayfa yüklemesine
     fazladan bir ağ turu ekliyordu — bu bileşen layout'ta. */
  const [agent, bell] = await Promise.all([
    getCurrentAgent(),
    getNotificationBellData(),
  ]);

  return (
    <NotificationBell
      initialNotifications={bell.recent}
      initialUnread={bell.unread}
      /* Realtime filtresi bundan kuruluyor. Personel kaydı olmayan ya da
         pasifleştirilmiş kullanıcıda `null` — abonelik hiç açılmıyor. */
      agentId={agent?.is_active ? agent.id : null}
      /* Göreli zamanlar bu ana göre — sunucuda üretiliyor ki istemci farklı
         bir "şimdi" hesaplayıp hydration uyuşmazlığı doğurmasın. */
      reference={Date.now()}
    />
  );
}
