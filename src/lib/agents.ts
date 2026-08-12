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

/** Badge variant adlarıyla eşleşir; yetki yükseldikçe vurgu artar. */
export const AGENT_ROLE_TONES: Record<AgentRole, "brand" | "warning" | "neutral"> =
  {
    patron: "brand",
    ofis_muduru: "warning",
    danisman: "neutral",
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

/** Personeller modülünü kimler görebilir. */
export const canViewStaff = isManagerRole;

/** Bir ilanı/müşteriyi başka bir danışmana atayabilir mi. */
export const canAssignAgent = isManagerRole;
