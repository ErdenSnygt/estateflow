import { cache } from "react";

import type { OfferStatus } from "@/types/database";
import type { OfferSortKey, SaleSortKey } from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";
import { rows } from "@/lib/data/query";
import {
  DAY,
  countPerMonth,
  countWithin,
  monthStartUtc,
  percentChange,
  type StatMetric,
} from "@/lib/data/stats";

/**
 * ============================================================================
 * SATIŞ VE TEKLİF VERİ ERİŞİMİ
 * ============================================================================
 * `sales` ve `offers` tabloları Faz 5'te açılmıştı ama okuma kodu
 * `data/listings.ts` içindeki `getListingStats()`e sıkışmıştı — o zaman iki
 * tablo yalnızca dashboard'ı besliyordu, kendi modülleri yoktu. Faz 8'de
 * modül geldi; sorgular da ait oldukları yere taşındı.
 *
 * DÜZELTME NOTU: bu iki sayı ("Bu Ay Satış", "Bekleyen Teklif") Faz 5'ten beri
 * mock DEĞİL, gerçek tablolardan okunuyordu. Faz 8'de değişen şey verinin
 * kaynağı değil, ARAYÜZDEN ÜRETİLEBİLİR hale gelmesi: buraya kadar tabloları
 * yalnızca seed dolduruyordu.
 *
 * RLS burada da görünmez ama etkili: bir danışman yalnızca kendi satış ve
 * tekliflerini görür (`sales.agent_id` / `offers.agent_id`), yönetici hepsini.
 * Sorgular aynı, politika farklı.
 */

/* ==========================================================================
   Listeler
   ========================================================================== */

/** Liste satırının ihtiyacı: satış + ilan başlığı + müşteri adı + danışman. */
export type SaleListItem = {
  id: string;
  amount: number;
  closed_at: string;
  listing: { id: string; title: string; city: string; district: string } | null;
  customer: { id: string; full_name: string } | null;
  agent: { id: string; full_name: string; initials: string } | null;
};

export type SaleFilters = {
  agent?: string;
  /** ISO tarih (yyyy-mm-dd) — dahil. */
  from?: string;
  /** ISO tarih (yyyy-mm-dd) — dahil (gün sonuna kadar). */
  to?: string;
  sort?: SaleSortKey;
};

const SALE_SELECT = `
  id, amount, closed_at,
  listing:listings(id, title, city, district),
  customer:customers(id, full_name),
  agent:agents(id, full_name, initials)
`;

export async function getSalesList(
  filters: SaleFilters = {},
): Promise<SaleListItem[]> {
  const supabase = await createClient();
  let query = supabase.from("sales").select(SALE_SELECT);

  if (filters.agent) query = query.eq("agent_id", filters.agent);
  if (filters.from) query = query.gte("closed_at", `${filters.from}T00:00:00Z`);
  /* Bitiş tarihi DAHİL: kullanıcı "31 Temmuz"a kadar dediğinde 31 Temmuz'da
     kapanan satışı da bekler, o günün sonuna kadar alınıyor. */
  if (filters.to) query = query.lte("closed_at", `${filters.to}T23:59:59Z`);

  switch (filters.sort) {
    case "amount-desc":
      query = query.order("amount", { ascending: false });
      break;
    case "amount-asc":
      query = query.order("amount", { ascending: true });
      break;
    default:
      query = query.order("closed_at", { ascending: false });
  }

  return rows<SaleListItem>(await query, "Satış listesi");
}

export type OfferListItem = {
  id: string;
  amount: number;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
  listing: {
    id: string;
    title: string;
    price: number;
    city: string;
    district: string;
  } | null;
  customer: { id: string; full_name: string } | null;
  agent: { id: string; full_name: string; initials: string } | null;
};

export type OfferFilters = {
  status?: OfferStatus;
  agent?: string;
  listing?: string;
  customer?: string;
  sort?: OfferSortKey;
};

const OFFER_SELECT = `
  id, amount, status, created_at, updated_at,
  listing:listings(id, title, price, city, district),
  customer:customers(id, full_name),
  agent:agents(id, full_name, initials)
`;

export async function getOffersList(
  filters: OfferFilters = {},
): Promise<OfferListItem[]> {
  const supabase = await createClient();
  let query = supabase.from("offers").select(OFFER_SELECT);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.agent) query = query.eq("agent_id", filters.agent);
  if (filters.listing) query = query.eq("listing_id", filters.listing);
  if (filters.customer) query = query.eq("customer_id", filters.customer);

  switch (filters.sort) {
    case "amount-desc":
      query = query.order("amount", { ascending: false });
      break;
    case "amount-asc":
      query = query.order("amount", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const offers = rows<OfferListItem>(await query, "Teklif listesi");

  /* Varsayılan sıralamada BEKLEYENLER EN ÜSTTE: üzerinde işlem yapılacak
     teklifler önce görünsün. Bu sıralama veritabanında yapılamıyor —
     `order("status")` alfabetik sıralar ve "pending" üçüncü sıraya düşerdi
     (accepted, expired, pending, rejected). PostgREST ise ifadeye göre
     sıralamayı desteklemiyor. `getCustomers`teki `interest-desc` ile aynı
     çözüm: ikincil sıra sorguda, asıl sıra burada.

     Kullanıcı açıkça bir sıralama seçtiyse ona dokunulmuyor. */
  if (!filters.sort || filters.sort === "recent") {
    offers.sort(
      (a, b) =>
        Number(b.status === "pending") - Number(a.status === "pending"),
    );
  }

  return offers;
}

/* ==========================================================================
   Dashboard toplamları
   ========================================================================== */

/**
 * FAZ 20: AY ADLARI BURADAN KALKTI.
 *
 * Bu dosyada `MONTH_SHORT` / `MONTH_LONG` diye iki Türkçe dizi vardı ve seri
 * "Nis" / "Nisan 2026" gibi HAZIR ETİKETLER döndürüyordu. Arayüz iki dilli
 * olunca bu, veri katmanının dil seçmesi anlamına geliyordu.
 *
 * Artık yalnızca ayın BAŞLANGIÇ ANI taşınıyor; etiketi çizen bileşen
 * üretiyor (`components/dashboard/sales-chart.tsx` → `useFormatter()`).
 * `recent-activity.tsx` başlığındaki kuralın aynısı: "cümlenin fiili UI'da
 * durur, veri katmanı yalnızca yapıyı taşır".
 */
export type SalesPoint = {
  /** "2026-04" — sıralama ve anahtar için. */
  month: string;
  /** Ayın ilk gününün ISO damgası — etiket bundan biçimlendiriliyor. */
  monthStart: string;
  sales: number;
  revenue: number;
};

/**
 * Son 12 ayın kapanan işlemleri, aya göre gruplanmış.
 *
 * Kaynak `listings` değil `sales`: 46 kayıtlık bir portföyde yalnızca birkaç
 * ilan "satildi" durumunda ve bu 12 aylık bir seriyi taşımaz. Kapanan işlem
 * zaten ilandan ayrı bir olgu — aynı ilan yıllar içinde birden çok kez el
 * değiştirebilir.
 *
 * Gruplama JavaScript'te; gerekçe `data/stats.ts` başlığında.
 *
 * `cache()` İSTEK BAŞINA: dashboard'da bu seri iki yerden isteniyor —
 * doğrudan satış grafiği tarafından ve `getSalesStats()` içinden KPI trendi
 * için. Önbellek olmadan aynı 12 aylık satır kümesi için iki kez ağa
 * çıkılıyordu.
 */
export const getSalesTimeSeries = cache(async function getSalesTimeSeries(): Promise<
  SalesPoint[]
> {
  const supabase = await createClient();

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const windowStart = Date.UTC(year, month - 11, 1);

  const sales = rows<{ amount: number; closed_at: string }>(
    await supabase
      .from("sales")
      .select("amount, closed_at")
      .gte("closed_at", new Date(windowStart).toISOString()),
    "Satış serisi",
  );

  /* Önce 12 boş kova: veri gelmeyen ay grafikten düşmesin, sıfır çizilsin. */
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - (11 - index), 1));
    const calendarMonth = date.getUTCMonth();

    return {
      month: `${date.getUTCFullYear()}-${String(calendarMonth + 1).padStart(2, "0")}`,
      monthStart: date.toISOString(),
      sales: 0,
      revenue: 0,
    };
  });

  const byMonth = new Map(buckets.map((bucket) => [bucket.month, bucket]));

  for (const sale of sales) {
    const closed = new Date(sale.closed_at);
    const key = `${closed.getUTCFullYear()}-${String(closed.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    if (!bucket) continue;
    bucket.sales += 1;
    bucket.revenue += sale.amount;
  }

  return buckets;
});

export type SalesStats = {
  /** İçinde bulunulan ayın cirosu (TRY). */
  monthlyRevenue: StatMetric;
  /** Ay içinde kapanan satış adedi. */
  monthlySales: number;
  pendingOffers: StatMetric;
  /** 12 aylık seri — grafik ve KPI trendi aynı sorgudan beslensin. */
  series: SalesPoint[];
};

/**
 * Dashboard'ın satış ve teklif kartları.
 *
 * Faz 8'e kadar bu hesap `getListingStats()` içindeydi ve ilan sayımlarıyla
 * aynı fonksiyonu paylaşıyordu. Ayrıldı: iki modül, iki fonksiyon.
 */
export async function getSalesStats(): Promise<SalesStats> {
  const supabase = await createClient();
  const now = Date.now();

  /* TEK TEKLİF SORGUSU (Faz 26 performans turu).
     Önce iki sorgu vardı: biri bekleyen teklifleri sayıyor (`head: true`),
     diğeri 190 günlük pencerede `created_at` çekiyordu. İkisi de aynı tabloya
     gidiyor ve dashboard'ın maliyeti veride değil İSTEK SAYISINDA —
     gerekçe `data/stats.ts` başlığında, ölçüm de orada: satır getirmekle tek
     bir sayı getirmek arasında fark yok, ağ turu ikisinde de aynı.

     İki kolon birlikte çekiliyor, sayım da trend de aynı kümeden çıkıyor.
     Tarih filtresi kalktı çünkü `countPerMonth` zaten yalnızca son 6 ayın
     kovalarını dolduruyor — daha eski satırlar hiçbir kovaya düşmüyor ve
     çıktı bit bit aynı. */
  const [series, offerHistory] = await Promise.all([
    getSalesTimeSeries(),
    supabase.from("offers").select("created_at, status"),
  ]);

  const offers = rows<{ created_at: string; status: OfferStatus }>(
    offerHistory,
    "Teklif geçmişi",
  );

  const pendingOfferCount = offers.filter(
    (row) => row.status === "pending",
  ).length;
  const offerAt = offers.map((row) => Date.parse(row.created_at));

  const thisMonth = series[series.length - 1];
  const lastMonth = series[series.length - 2];

  return {
    monthlyRevenue: {
      value: thisMonth.revenue,
      delta: percentChange(thisMonth.revenue, lastMonth.revenue),
      trend: series.slice(-6).map((point) => point.revenue),
    },
    monthlySales: thisMonth.sales,
    pendingOffers: {
      /* Değer o anki bekleyen teklif sayısı; trend ise AYLIK GELEN teklif
         sayısı. İkisi farklı birim — "kaç teklif birikti" tek bir sayıdır,
         geçmişi ancak teklif akışıyla anlatılabilir. */
      value: pendingOfferCount,
      delta: percentChange(
        countWithin(offerAt, now - 30 * DAY, now + DAY),
        countWithin(offerAt, now - 60 * DAY, now - 30 * DAY),
      ),
      trend: countPerMonth(offerAt, 6, now),
    },
    series,
  };
}

/* ==========================================================================
   Personel performansı
   ========================================================================== */

export type AgentSalesTotal = {
  /** Tüm zamanların cirosu (TRY). */
  totalRevenue: number;
  totalSales: number;
  /** İçinde bulunulan takvim ayının cirosu (TRY). */
  monthlyRevenue: number;
  monthlySales: number;
};

/**
 * Bir personelin satış toplamları.
 *
 * `data/agents.ts` içindeki `getAgentPerformance` bunu çağırıyor; hesap
 * burada duruyor ki satış mantığı tek modülde kalsın. Prim çarpımı ise
 * personel tarafında — oran `agents` tablosunda.
 */
export async function getAgentSalesTotal(
  agentId: string,
): Promise<AgentSalesTotal> {
  const supabase = await createClient();
  const since = monthStartUtc(Date.now());

  const sales = rows<{ amount: number; closed_at: string }>(
    await supabase
      .from("sales")
      .select("amount, closed_at")
      .eq("agent_id", agentId),
    "Personel satışları",
  );

  const total: AgentSalesTotal = {
    totalRevenue: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    monthlySales: 0,
  };

  for (const sale of sales) {
    total.totalSales += 1;
    total.totalRevenue += sale.amount;
    if (Date.parse(sale.closed_at) >= since) {
      total.monthlySales += 1;
      total.monthlyRevenue += sale.amount;
    }
  }

  return total;
}
