import { cache } from "react";

import type { Notification } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";

/**
 * ============================================================================
 * BİLDİRİM VERİ ERİŞİMİ
 * ============================================================================
 * `activity_log` (data/activity.ts) ile karıştırılmamalı — o ofisin ortak
 * akışı, bu KİŞİSEL GELEN KUTUSU. Ayrımın tamamı `0008_messaging.sql`
 * başlığında ve README'de.
 *
 * -----------------------------------------------------------------------------
 * HER SORGU `agent_id = ben` FİLTRESİ TAŞIYOR
 * -----------------------------------------------------------------------------
 * RLS politikası yöneticiye tüm satırları okuma izni veriyor (rol modeline
 * sadık kalındı) ama BU İSTENEN ŞEY DEĞİL: bir patronun gelen kutusunda ekibin
 * bildirimlerinin görünmesi anlamsız olurdu. Filtre bu yüzden uygulamada ve
 * atlanamaz — fonksiyonların hiçbiri "hepsini getir" seçeneği sunmuyor.
 *
 * -----------------------------------------------------------------------------
 * HATA FIRLATILMIYOR — `rows()` / `counted()` KULLANILMIYOR
 * -----------------------------------------------------------------------------
 * Diğer veri modülleri sorgu hatasını istisnaya çeviriyor: hata "boş liste"
 * gibi görünmesin, Next hata sınırı görünür bir sayfa bassın. Burada kural
 * tersine çevrildi çünkü BU SORGU LAYOUT'TA çalışıyor — zil her sayfada var.
 * Bir istisna, tek bir bileşeni değil UYGULAMANIN TAMAMINI hata ekranına
 * düşürürdü; üstelik migration 0008 çalıştırılmadan önce her sayfayı.
 *
 * `getCurrentAgent()` aynı gerekçeyle aynı kararı vermişti (`lib/auth/server.ts`):
 * layout'ta okunan bir şeyin okunamaması, uygulamayı çökertmemeli. Bildirimi
 * görünmeyen kullanıcı yalnızca boş bir zil görüyor; sorun sunucu günlüğünde.
 */

export type NotificationItem = Notification;

/** Personel kaydı olmayan kullanıcı için sorgu hiç açılmıyor. */
async function currentAgentId(): Promise<string | null> {
  const agent = await getCurrentAgent();
  return agent?.is_active ? agent.id : null;
}

/**
 * Gelen kutusu.
 *
 * `cache()` İSTEK BAŞINA: navbar açılırı ve `/bildirimler` sayfası aynı
 * render'da ikisi birden bu listeyi isteyebiliyor.
 */
export const getNotifications = cache(async function getNotifications(
  limit = 50,
): Promise<NotificationItem[]> {
  const agentId = await currentAgentId();
  if (!agentId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[notifications] liste okunamadı: ${error.message}`);
    return [];
  }

  return data ?? [];
});

/** Navbar açılırındaki kısa liste — tam listeyle aynı sorgudan beslenmesin
 *  diye ayrı bir limit alıyor; açılırda sekiz satır yeterli. */
export async function getRecentNotifications(limit = 8): Promise<NotificationItem[]> {
  const all = await getNotifications();
  return all.slice(0, limit);
}

/**
 * Zil için liste + okunmamış sayısı — TEK SORGUDA.
 *
 * -----------------------------------------------------------------------------
 * NEDEN AYRI BİR FONKSİYON
 * -----------------------------------------------------------------------------
 * Zil LAYOUT'TA, yani her sayfa çiziminde çalışıyor. Önceki hâlinde iki ayrı
 * çağrı vardı (`getRecentNotifications` + `getUnreadNotificationCount`) ve
 * ikincisi ayrı bir `head: true` sayımıydı — uygulamadaki HER sayfa yüklemesi
 * bir fazladan ağ turu ödüyordu.
 *
 * Sayım artık zaten çekilmiş listeden yapılıyor. Bunun bir sınırı var ve
 * kabul edilebilir: liste 50 satırla sınırlı, dolayısıyla 50'den fazla
 * okunmamış bildirimi olan birinde sayı 50'de doyuyor. Rozet zaten dokuzdan
 * sonra "9+" gösteriyor — yani kullanıcıya görünen çıktı değişmiyor.
 *
 * `getUnreadNotificationCount` yerinde duruyor: tam sayının gerektiği bir
 * yer çıkarsa (ör. rapor) doğru araç o.
 */
export const getNotificationBellData = cache(
  async function getNotificationBellData(previewLimit = 8): Promise<{
    recent: NotificationItem[];
    unread: number;
  }> {
    const all = await getNotifications();

    return {
      recent: all.slice(0, previewLimit),
      unread: all.filter((notification) => notification.read_at === null).length,
    };
  },
);

/**
 * Zil rozetindeki sayı.
 *
 * `head: true` sayımı: satırların kendisi gerekmiyor, yalnızca adet. Kısmi
 * indeks (`notifications_unread_idx`) bu sorgu için var.
 */
export const getUnreadNotificationCount = cache(
  async function getUnreadNotificationCount(): Promise<number> {
    const agentId = await currentAgentId();
    if (!agentId) return 0;

    const supabase = await createClient();

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .is("read_at", null);

    if (error) {
      console.error(`[notifications] sayaç okunamadı: ${error.message}`);
      return 0;
    }

    return count ?? 0;
  },
);
