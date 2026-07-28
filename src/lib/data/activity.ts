import type { ActivityEventType } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { rows } from "@/lib/data/query";

/**
 * ============================================================================
 * AKTİVİTE AKIŞI
 * ============================================================================
 * Neden ayrı modül: akış hem ilan hem müşteri olaylarını taşıyor, yani
 * ikisinin de üstünde duruyor. Faz 4'te bu bir bağımlılık meselesiydi
 * (İlanlar'ın Müşteriler'i import etmesi gerekiyordu); Faz 5'te tablo
 * ayrımı zaten aynı yeri işaret ediyor: `activity_log`.
 *
 * Tabloda olay metni `description` kolonunda ve KISA ÖZNE olarak duruyor
 * ("Deniz Manzaralı 3+1 Daire"), tam cümle değil. Fiili arayüz kuruyor
 * ("… portföye eklendi"), böylece metin dili tek yerde toplanıyor ve olay
 * tipine göre farklı gösterim yapmak mümkün oluyor.
 */

export type ActivityType = ActivityEventType;

export type ActivityItem = {
  id: string;
  type: ActivityType;
  /** Olayı gerçekleştiren danışman. */
  actor: string;
  /** Kısa özne: ilan başlığı ya da müşteri adı. Cümleyi UI kurar. */
  subject: string;
  /** İlgili ilan — UI bağlantı verir. */
  listing_id: string | null;
  /** İlgili müşteri — müşteri olaylarında dolu. */
  customer_id: string | null;
  /** Satış / teklif tutarı (TRY); diğer olaylarda null. */
  amount: number | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  type: ActivityType;
  subject: string;
  amount: number | null;
  listing_id: string | null;
  customer_id: string | null;
  created_at: string;
  /** Gömülü danışman kaydı; silinmiş danışmanda null. */
  actor: { full_name: string } | null;
};

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient();

  const data = rows<ActivityRow>(
    await supabase
      .from("activity_log")
      .select(
        "id, type:event_type, subject:description, amount, listing_id:related_listing_id, customer_id:related_customer_id, created_at, actor:agents(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    "Aktivite akışı",
  );

  return data.map(({ actor, ...row }) => ({
    ...row,
    /* Danışman kaydı silinmişse satır yine de okunabilir kalmalı. */
    actor: actor?.full_name ?? "Sistem",
  }));
}
