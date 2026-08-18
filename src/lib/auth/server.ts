import { cache } from "react";
import { getTranslations } from "next-intl/server";

import type { Agent } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { canViewAll, isManagerRole, isReadOnlyRole } from "@/lib/agents";

import { toSession, type Session } from "./session";

/**
 * ============================================================================
 * SUNUCU TARAFI OTURUM
 * ============================================================================
 * `session.ts` bilinçli olarak `next/headers` kullanmaz — middleware edge
 * runtime'da çalışır ve o modülü import edemez. Okuma noktası ikiye ayrılır,
 * çözümleme (`toSession`) tek yerde kalır.
 *
 * `cache()` SARMALAMASI ÖNEMLİ: bir sayfa çizilirken oturum birden fazla yerde
 * soruluyor — layout kabuğu, sayfanın kendisi, yetki kontrolü yapan bileşen.
 * React'in istek kapsamlı önbelleği olmadan aynı render'da üç kez Supabase'e
 * gidilirdi. Önbellek istek başına; iki farklı kullanıcının isteği birbirinin
 * sonucunu görmez.
 */

/** `Agent` tipinde olan ama burada gereksiz olan hiçbir kolon yok — tamamı. */
const AGENT_COLUMNS =
  "id, full_name, initials, title, role, email, phone, user_id, avatar_url, cover_url, commission_rate, is_active, notification_preferences, created_at";

/**
 * Doğrulanmış kullanıcı — İSTEK BAŞINA TEK AĞ TURU.
 *
 * `supabase.auth.getUser()` yerel bir okuma değil, Supabase'in `/auth/v1/user`
 * ucuna gerçek bir istek (ölçüldü: ~78 ms). Bu fonksiyon ayrı bir katman
 * olarak var çünkü `getSession()` ve `getCurrentAgent()` ikisi de kullanıcıya
 * ihtiyaç duyuyor ve her ikisi de kendi `getUser()` çağrısını yapıyordu — tek
 * bir sayfa çiziminde aynı yanıt için iki kez ağa çıkılıyordu.
 *
 * `cache()` istek kapsamlı: iki farklı kullanıcının isteği birbirinin sonucunu
 * görmez.
 */
const getVerifiedUser = cache(async function getVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Giriş yapan kullanıcının personel kaydı.
 *
 * `null` dönmesinin iki nedeni olabilir ve ikisi de normaldir:
 *  · oturum yok,
 *  · oturum var ama kullanıcı hiçbir `agents` satırına bağlanmamış.
 *
 * İkincisi RLS tarafında da aynı anlama gelir (`current_agent_id()` null),
 * yani böyle bir kullanıcı hiçbir veri göremez. Arayüz bunu boş liste yerine
 * açık bir uyarıyla anlatıyor — `components/layout/agent-notice.tsx`.
 */
export const getCurrentAgent = cache(async function getCurrentAgent(): Promise<
  Agent | null
> {
  const user = await getVerifiedUser();
  if (!user) return null;

  const supabase = await createClient();

  /* `maybeSingle()` + hata yutma: bu fonksiyon layout'ta çağrılıyor ve
     personel kaydının okunamaması uygulamanın tamamını hata sayfasına
     çevirmemeli. Kayıt yoksa da okunamıyorsa da sonuç aynı: yetkisiz. */
  const { data } = await supabase
    .from("agents")
    .select(AGENT_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  return data ?? null;
});

export const getSession = cache(async function getSession(): Promise<Session | null> {
  /* İkisi de aynı önbelleklenmiş kullanıcıyı paylaşıyor; `getCurrentAgent`
     yalnızca `agents` sorgusu kadar ek maliyet getiriyor. */
  const [user, agent, t] = await Promise.all([
    getVerifiedUser(),
    getCurrentAgent(),
    getTranslations("common"),
  ]);

  if (!user) return null;

  /* Yedek ad ve unvan sözlükten: `toSession` saf olduğu için metni buradan
     alıyor (gerekçe `session.ts` içindeki `SessionFallbacks` başlığında). */
  return toSession(user, agent, {
    name: t("fallbackUserName"),
    title: t("awaitingRole"),
  });
});

/**
 * Yönetici kapsamındaki sayfalar için kapı.
 *
 * Sayfa yönlendirme YAPMIYOR, `null` dönüyor: `/personeller`e tıklayan bir
 * danışmanı sessizce dashboard'a atmak "bir şeyler bozuldu" hissi verir.
 * Çağıran sayfa `null` görünce yetkisiz durumunu çiziyor.
 */
export async function getManagerAgent(): Promise<Agent | null> {
  const agent = await getCurrentAgent();
  /* Pasifleştirilmiş bir yönetici de yetkisiz. Veritabanı tarafında zaten
     kapalı (`current_agent_id()` pasif kayda null döner, dolayısıyla tüm
     politikalar kapanır); buradaki kontrol arayüzün de aynı şeyi söylemesi
     için. */
  return agent && agent.is_active && isManagerRole(agent.role) ? agent : null;
}

/**
 * Yönetici kapsamını GÖRMEYE yetkili kayıt — yönetici ya da demo (Faz 28).
 *
 * `getManagerAgent()` ile arasındaki fark tek kelime ama sınırı o kelime
 * çiziyor: bu fonksiyon SAYFA AÇAR, öteki YAZMA İZNİ VERİR.
 *
 *   /personeller            → `getViewerAgent()`  (demo bakabilir)
 *   /personeller/[id]       → `getViewerAgent()`  (demo bakabilir)
 *   /personeller/[id]/duzenle → `getManagerAgent()` (demo giremez)
 *
 * Demo düzenleme sayfasına girebilseydi formu doldurup kaydete basar ve
 * ancak o zaman engellenirdi — reddi kapıda vermek daha dürüst.
 */
export async function getViewerAgent(): Promise<Agent | null> {
  const agent = await getCurrentAgent();
  return agent && agent.is_active && canViewAll(agent.role) ? agent : null;
}

/**
 * Giriş yapan kullanıcı salt okunur mu?
 *
 * `lib/actions/guard.ts` bunu her yazma action'ının başında soruyor. Ayrı bir
 * fonksiyon olmasının sebebi `getCurrentAgent()`in `cache()` ile sarılı
 * olması: soru bir istekte kaç kez sorulursa sorulsun tek bir sorgu.
 */
export async function isReadOnlySession(): Promise<boolean> {
  const agent = await getCurrentAgent();
  return isReadOnlyRole(agent?.role);
}
