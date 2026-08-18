import type { AgentRole } from "@/types/database";

/**
 * PERSONEL ARAYÜZ SÖZLÜĞÜ
 *
 * `lib/listings.ts` ve `lib/customers.ts` ile aynı desende: etiketler, rozet
 * tonları ve yetki soruları burada durur; veri katmanı yalnızca ham değeri
 * taşır.
 *
 * Bu dosyanın istemci bileşenlerinden import EDİLEBİLMESİ önemli — sunucuya
 * bağımlı hiçbir şey içermez (`lib/data/agents.ts` içerir).
 */

/* --- Yetki rolleri -------------------------------------------------------- */

/**
 * Rozette ve açılırda bu sırayla; etiketler sözlükte (`agents.role.*`).
 *
 * DEĞERLER TÜRKÇE KALIYOR ve kalmalı: `agents.role` bir Postgres enum'u
 * (`0002_agents_auth_link.sql`) ve RLS politikaları bu değerleri metin olarak
 * karşılaştırıyor. Görünen ad ile saklanan değer arasındaki ayrım,
 * `lib/calendar.ts` içindeki takvim görünümleriyle aynı ayrım.
 *
 * İngilizce karşılıklar sözlükte ofis hiyerarşisine göre seçildi:
 * patron → Owner, ofis_muduru → Office Manager, danisman → Agent.
 */
export const AGENT_ROLES = [
  "patron",
  "ofis_muduru",
  "danisman",
] as const satisfies readonly AgentRole[];

/**
 * Etiketi olması gereken TÜM roller — `AGENT_ROLES` ile aynı şey değil.
 *
 * `AGENT_ROLES` "personel formunda seçilebilenler" listesi ve `demo` oraya
 * girmiyor: demo bir kariyer basamağı değil, tek ve elle kurulan bir tanıtım
 * hesabı. Bir yöneticinin gerçek bir danışmanı yanlışlıkla salt okunur yapması
 * için sebep yok.
 *
 * Ama rozet demo kullanıcıya da çiziliyor, dolayısıyla `agents.role.demo`
 * anahtarı sözlükte OLMAK ZORUNDA. `messages.test.ts` bu listeyi denetliyor.
 */
export const ALL_AGENT_ROLES = [
  ...AGENT_ROLES,
  "demo",
] as const satisfies readonly AgentRole[];

/** Badge variant adlarıyla eşleşir; yetki yükseldikçe vurgu artar. */
export const AGENT_ROLE_TONES: Record<
  AgentRole,
  "brand" | "warning" | "neutral" | "outline"
> = {
  patron: "brand",
  ofis_muduru: "warning",
  danisman: "neutral",
  /* `outline`: dolu bir rozet "bu bir yetki kademesi" der. Demo bir kademe
     değil, bir kısıt — çerçeveli ve sessiz duruyor. */
  demo: "outline",
};

/* --- Yetki soruları ------------------------------------------------------- */

/**
 * Yönetici mi?
 *
 * Veritabanındaki `is_manager()` fonksiyonunun arayüz karşılığı ve İKİSİ DE
 * gereklidir: RLS veriyi korur, bu ise düğmeyi gizler. Yalnızca arayüzde
 * kontrol etmek güvenlik değil kozmetiktir; yalnızca RLS'te kontrol etmek ise
 * kullanıcıya tıklayınca hata veren düğmeler gösterir.
 *
 * Ofis müdürünün şu an patronla aynı kapsamda olmasının gerekçesi
 * `0002_agents_auth_link.sql` içindeki `is_manager()` yorumunda.
 */
export function isManagerRole(role: AgentRole | null | undefined): boolean {
  return role === "patron" || role === "ofis_muduru";
}

/* --- Demo: iki soruyu ayırmak (Faz 28) ------------------------------------ */

/**
 * Salt okunur tanıtım hesabı mı?
 *
 * `demo` rolü diğer üçünden FARKLI BİR EKSENDE. Patron/ofis müdürü/danışman
 * "ne kadarını görür" sorusunu yanıtlıyor ve üçü de yazabiliyor. Demo bunu
 * ikiye ayırıyor: görüşü patron kadar geniş, yazması sıfır.
 *
 * Bu ayrım olmadan tek bir `isManagerRole()` yetmiyordu, çünkü o fonksiyon
 * HEM sayfa açan HEM yazma izni veren yerlerde kullanılıyor. Aynı soruya iki
 * ayrı cevap gerekince iki ayrı fonksiyon gerekti.
 */
export function isReadOnlyRole(role: AgentRole | null | undefined): boolean {
  return role === "demo";
}

/**
 * Bütün portföyü görebilir mi? (patron · ofis müdürü · demo)
 *
 * OKUMA kapılarında kullanılır: sayfa açma, danışman filtresi doldurma, ekip
 * listesi gösterme. Yazma kapılarında KULLANILMAZ — orada `isManagerRole`
 * duruyor ve demo oradan geçemiyor.
 *
 * Veritabanı tarafındaki karşılığı `is_manager() or is_demo()`; ikisi ayrı
 * politikalar olarak yazıldı (`0013_demo_role.sql`).
 */
export function canViewAll(role: AgentRole | null | undefined): boolean {
  return isManagerRole(role) || isReadOnlyRole(role);
}

/** Personeller modülünü kimler görebilir — demo dahil, yalnızca bakmak için. */
export const canViewStaff = canViewAll;

/**
 * Bir ilanı/müşteriyi başka bir danışmana atayabilir mi.
 *
 * `isManagerRole` KALIYOR, `canViewAll` DEĞİL: bu bir yazma yetkisi.
 */
export const canAssignAgent = isManagerRole;
