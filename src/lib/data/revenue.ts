import { cache } from "react";

import type { CommissionStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { rows } from "@/lib/data/query";
import {
  commissionFor,
  sumCommissions,
  type CommissionTotals,
} from "@/lib/revenue";

/**
 * ============================================================================
 * GELİR (KOMİSYON) VERİ ERİŞİMİ
 * ============================================================================
 * Kaynak `sales` tablosu — Satışlar modülüyle AYNI tablo, farklı soru.
 * Ayrımın tamamı `lib/revenue.ts` başlığında ve README'de.
 *
 * -----------------------------------------------------------------------------
 * TEK SORGU, İKİ ÇIKTI
 * -----------------------------------------------------------------------------
 * Hem genel özet hem danışman dökümü AYNI satır kümesinden hesaplanıyor.
 * İki ayrı sorgu atmak (biri toplam, biri gruplu) iki ağ turu ve iki farklı
 * "doğru toplam" demekti; PostgREST'te gruplama zaten sınırlı ve projede
 * aggregate'ler baştan beri JavaScript'te (gerekçe `data/stats.ts`).
 *
 * Prim oranı `agents` tablosundan gömme ile geliyor: satış satırında oran
 * saklanmıyor (gerekçe `0011_commission.sql`).
 *
 * RLS görünmez ama etkili: danışman yalnızca kendi satışlarını görüyor
 * (`sales_scoped`), yani `getRevenueByAgent` onun için tek satır döndürüyor.
 * Ek bir filtre gerekmiyor.
 */

/** Komisyona çevrilmiş tek satış satırı. */
export type CommissionRow = {
  id: string;
  amount: number;
  commission: number;
  commission_status: CommissionStatus;
  closed_at: string;
  listing: { id: string; title: string } | null;
  customer: { id: string; full_name: string } | null;
  agent: {
    id: string;
    full_name: string;
    initials: string;
    avatar_url: string | null;
    commission_rate: number;
  } | null;
};

type RawSale = {
  id: string;
  amount: number;
  commission_status: CommissionStatus;
  closed_at: string;
  listing: { id: string; title: string } | null;
  customer: { id: string; full_name: string } | null;
  agent: {
    id: string;
    full_name: string;
    initials: string;
    avatar_url: string | null;
    commission_rate: number;
  } | null;
};

const REVENUE_SELECT = `
  id, amount, commission_status, closed_at,
  listing:listings(id, title),
  customer:customers(id, full_name),
  agent:agents(id, full_name, initials, avatar_url, commission_rate)
`;

/**
 * Dönemdeki komisyon satırları.
 *
 * `cache()` İSTEK BAŞINA: sayfa hem özeti, hem grafiği, hem danışman
 * dökümünü, hem de listeyi çiziyor ve dördü de aynı satırlardan besleniyor.
 * Önbellek olmadan aynı sorgu dört kez atılırdı.
 */
export const getCommissionRows = cache(async function getCommissionRows(
  days: number,
): Promise<CommissionRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const raw = rows<RawSale>(
    await supabase
      .from("sales")
      .select(REVENUE_SELECT)
      .gte("closed_at", since)
      .order("closed_at", { ascending: false }),
    "Komisyon listesi",
  );

  /* Komisyon BURADA türetiliyor, veritabanında değil: oran `agents`ta ve
     PostgREST iki tablo arasında çarpım yapamıyor. */
  return raw.map((sale) => ({
    ...sale,
    commission: commissionFor(sale.amount, sale.agent?.commission_rate ?? 0),
  }));
});

/* ==========================================================================
   Özet
   ========================================================================== */

export type RevenuePoint = {
  /**
   * "2026-04" — grafiğin ekseninde gösterilen ay.
   *
   * ETİKET YOK (Faz 25): burada bir `label: "Nis"` alanı vardı ve o alan sabit
   * Türkçe ay adlarından geliyordu. Veri katmanı aktif dili bilmiyor; anahtarı
   * taşıyor, `i18n/dates.ts` içindeki `formatMonthKey` onu çeviriyor.
   */
  month: string;
  /** Toplam komisyon (TRY). */
  commission: number;
  /** Yalnızca tahsil edilen — grafikte ikinci seri. */
  collected: number;
  /**
   * Komisyonun dayandığı satış hacmi (TRY).
   *
   * Gelirler sayfası bunu kullanmıyor ama Raporlar'daki satış trendi
   * kullanıyor — aynı önbellekli sorgudan besleniyor, yani Raporlar için
   * ayrı bir "satış serisi" sorgusu açılmıyor.
   */
  volume: number;
  /** Kapanan işlem adedi. */
  count: number;
};

export type RevenueOverview = {
  totals: CommissionTotals;
  /** Dönemdeki kapanan işlem adedi. */
  saleCount: number;
  /** Komisyonun dayandığı toplam satış hacmi (TRY). */
  volume: number;
  series: RevenuePoint[];
  rows: CommissionRow[];
};

/**
 * Gelirler sayfasının tamamını besleyen tek çağrı.
 *
 * Aylık seri kovaları ÖNCEDEN AÇILIYOR: veri gelmeyen ay grafikten düşmesin,
 * sıfır çizilsin. `getSalesTimeSeries` (Faz 8) ile aynı yaklaşım — orada 12
 * ay sabitti, burada dönem seçimine göre değişiyor.
 */
export async function getRevenueOverview(
  days: number,
): Promise<RevenueOverview> {
  const commissionRows = await getCommissionRows(days);

  const totals = sumCommissions(commissionRows);

  /* Kaç aylık kova gerekiyor: 30 gün → 2, 365 gün → 13. Üstten yuvarlanıyor
     ki dönemin ilk günü de bir kovaya düşsün. */
  const monthCount = Math.min(13, Math.max(2, Math.ceil(days / 30) + 1));

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const buckets: RevenuePoint[] = Array.from(
    { length: monthCount },
    (_, index) => {
      const date = new Date(
        Date.UTC(year, month - (monthCount - 1 - index), 1),
      );
      const calendarMonth = date.getUTCMonth();
      return {
        month: `${date.getUTCFullYear()}-${String(calendarMonth + 1).padStart(2, "0")}`,
        commission: 0,
        collected: 0,
        volume: 0,
        count: 0,
      };
    },
  );

  const byMonth = new Map(buckets.map((bucket) => [bucket.month, bucket]));

  let volume = 0;

  for (const row of commissionRows) {
    volume += row.amount;

    const closed = new Date(row.closed_at);
    const key = `${closed.getUTCFullYear()}-${String(closed.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    if (!bucket) continue;

    bucket.commission += row.commission;
    bucket.volume += row.amount;
    bucket.count += 1;
    if (row.commission_status === "collected") {
      bucket.collected += row.commission;
    }
  }

  return {
    totals,
    saleCount: commissionRows.length,
    volume,
    series: buckets,
    rows: commissionRows,
  };
}

/* ==========================================================================
   Danışman dökümü
   ========================================================================== */

export type AgentRevenue = {
  agentId: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  commissionRate: number;
  saleCount: number;
  /** Satış hacmi (TRY) — komisyonun dayandığı bedel. */
  volume: number;
  totals: CommissionTotals;
};

/**
 * Danışman bazlı komisyon dökümü.
 *
 * AYRI SORGU YOK: `getCommissionRows` önbellekli, yani aynı istek içinde
 * `getRevenueOverview` ile birlikte çağrıldığında ağa ikinci kez çıkılmıyor.
 *
 * KAPSAMI RLS BELİRLİYOR. Bir danışman için sorgu zaten yalnızca kendi
 * satışlarını döndürüyor, dolayısıyla liste tek satır oluyor — uygulamada
 * ayrıca rol kontrolü yapmaya gerek yok. Arayüz yine de bölümün başlığını
 * role göre değiştiriyor ("Ekip dökümü" / "Komisyon dökümünüz").
 */
export async function getRevenueByAgent(days: number): Promise<AgentRevenue[]> {
  const commissionRows = await getCommissionRows(days);

  const grouped = new Map<string, CommissionRow[]>();

  for (const row of commissionRows) {
    if (!row.agent) continue;
    const list = grouped.get(row.agent.id) ?? [];
    list.push(row);
    grouped.set(row.agent.id, list);
  }

  const result: AgentRevenue[] = [];

  for (const [agentId, list] of grouped) {
    const agent = list[0].agent!;
    result.push({
      agentId,
      fullName: agent.full_name,
      initials: agent.initials,
      avatarUrl: agent.avatar_url,
      commissionRate: agent.commission_rate,
      saleCount: list.length,
      volume: list.reduce((sum, row) => sum + row.amount, 0),
      totals: sumCommissions(list),
    });
  }

  /* En çok kazanan üstte — tablo bir sıralama olarak okunuyor. */
  return result.sort((a, b) => b.totals.total - a.totals.total);
}
