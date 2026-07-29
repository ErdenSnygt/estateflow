import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  NotificationEntity,
  NotificationType,
} from "@/types/database";
import { isNotificationEnabled } from "@/lib/notification-preferences";

/**
 * ============================================================================
 * BİLDİRİM YAZMA — TETİKLEYİCİLERİN ORTAK NOKTASI
 * ============================================================================
 * Bu dosya bir server action DEĞİL, başka action'ların çağırdığı bir yardımcı.
 * `"use server"` taşımıyor: dışa açık bir uç olsaydı istemci istediği kişiye
 * istediği bildirimi yazabilirdi.
 *
 * -----------------------------------------------------------------------------
 * NEDEN VERİTABANI TETİKLEYİCİSİ DEĞİL
 * -----------------------------------------------------------------------------
 * `after insert` tetikleyicileri de aynı satırları yazabilirdi ama projede yan
 * etkiler baştan beri server action içinde duruyor (teklif kabulü satışı orada
 * açıyor, tamamlanan randevu çizelgeye orada yazıyor). Aynı gerekçe:
 *
 *  · Bildirim METNİ arayüz diliyle yazılıyor; SQL içinde Türkçe cümle kurmak
 *    metni koddan koparırdı.
 *  · Tetikleyici `revalidatePath` çağıramaz — bildirim yazılır, zil rozeti
 *    güncellenmezdi.
 *  · Kimin bildirim alacağı bazen iş kuralı ("prim ilanın sahibine gider,
 *    bildirim de ona"), veritabanı bunu bilmiyor.
 *
 * -----------------------------------------------------------------------------
 * BİLDİRİM HATASI ASIL İŞLEMİ BOZMAZ
 * -----------------------------------------------------------------------------
 * `lib/storage/cleanup.ts` ile aynı sözleşme: fonksiyon istisna fırlatmaz.
 * "Müşteri eklendi ama bildirim yazılamadı" kullanıcı için bir başarısızlık
 * değil; asıl işlem tamamlandı. Tersi olsaydı bildirim tablosundaki geçici bir
 * sorun müşteri eklemeyi engellerdi.
 */

type Client = SupabaseClient<Database>;

export type NotifyInput = {
  /** Bildirimin sahibi. Kendine bildirim yazmak sessizce atlanır. */
  agentId: string | null | undefined;
  type: NotificationType;
  title: string;
  description?: string;
  entityType?: NotificationEntity;
  entityId?: string | null;
};

/**
 * Tek bildirim yazar.
 *
 * `actorAgentId` verilirse ve hedefle aynıysa BİLDİRİM YAZILMAZ. Kendi
 * yaptığın işin bildirimini almak gürültüden başka bir şey değil: müşteriyi
 * ekleyen danışman zaten eklediğini biliyor. Bildirim ancak BAŞKASININ
 * eylemi seni ilgilendirdiğinde anlamlı — bir yönetici senin ilanına gelen
 * teklifi kabul ettiğinde ya da müşteriden mesaj geldiğinde.
 */
export async function notify(
  supabase: Client,
  input: NotifyInput & { actorAgentId?: string | null },
): Promise<void> {
  if (!input.agentId) return;
  if (input.actorAgentId && input.actorAgentId === input.agentId) return;

  /* KULLANICI TERCİHİ — Faz 14.
     Kapalı bir tür için satır HİÇ AÇILMIYOR; "yaz ama gösterme" yaklaşımı
     seçilmedi çünkü o zaman kullanıcı tercihini açtığında geçmişteki tüm
     bildirimler birden belirirdi.

     Tercih okunamazsa (satır yok, kolon henüz eklenmemiş, ağ hatası) bildirim
     YAZILIYOR. Yön bilinçli: susturmak, sessizce bozulmuş bir uygulama
     üretirdi — `lib/notification-preferences.ts` başlığındaki aynı gerekçe. */
  const { data: target } = await supabase
    .from("agents")
    .select("notification_preferences")
    .eq("id", input.agentId)
    .maybeSingle();

  if (
    target &&
    !isNotificationEnabled(target.notification_preferences, input.type)
  ) {
    return;
  }

  const { error } = await supabase.from("notifications").insert({
    agent_id: input.agentId,
    type: input.type,
    title: input.title,
    description: input.description ?? "",
    related_entity_type: input.entityType ?? null,
    related_entity_id: input.entityId ?? null,
  });

  if (error) {
    console.error(`[notify] ${input.type} bildirimi yazılamadı: ${error.message}`);
  }
}
