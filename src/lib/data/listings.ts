import { cache } from "react";

import type { Listing, ListingCategory, ListingStatus } from "@/types/database";
import type { SortKey } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { maybeRow, rows, sanitizeSearch } from "@/lib/data/query";
import {
  DAY,
  countPerMonth,
  countWithin,
  percentChange,
  type StatMetric,
} from "@/lib/data/stats";

/**
 * ============================================================================
 * İLAN VERİ ERİŞİMİ
 * ============================================================================
 * Faz 5: gövdeler tohumlu mock üretimden Supabase sorgularına geçti.
 * Fonksiyon imzaları — isim, parametre, dönüş tipi — Faz 4'teki gibi kaldı;
 * çağıran hiçbir sayfa ya da bileşen değişmedi. Faz 2'de yazdığımız
 * "geçişte yalnızca gövdeler değişecek" notunun sınavıydı, geçti.
 *
 * Yapay gecikme (MOCK_LATENCY_MS) kaldırıldı: artık gerçek bir ağ turu var,
 * iskelet durumları kendiliğinden görünüyor.
 */

/* ==========================================================================
   Sorgu arayüzü
   ========================================================================== */

export type ListingFilters = {
  city?: string;
  district?: string;
  category?: ListingCategory;
  status?: ListingStatus;
  /** Portföy sorumlusu. Personel detay sayfası bu filtreyle çağırır. */
  agent?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  /** Seçilen değer ve üzeri oda sayısı. */
  rooms?: number;
  search?: string;
  sort?: SortKey;
};

/** Filtreler AND mantığıyla birleşir. */
export async function getListings(
  filters: ListingFilters = {},
): Promise<Listing[]> {
  const supabase = await createClient();
  let query = supabase.from("listings").select("*");

  if (filters.city) query = query.eq("city", filters.city);
  if (filters.district) query = query.eq("district", filters.district);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.agent) query = query.eq("agent_id", filters.agent);
  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
  if (filters.minArea !== undefined) query = query.gte("area_sqm", filters.minArea);
  if (filters.maxArea !== undefined) query = query.lte("area_sqm", filters.maxArea);
  /* "3+1 ve üzeri" — filtre bir alt sınır, tam eşleşme değil. */
  if (filters.rooms !== undefined) query = query.gte("room_count", filters.rooms);

  if (filters.search) {
    const needle = sanitizeSearch(filters.search);
    if (needle) {
      const pattern = `%${needle}%`;
      query = query.or(
        [
          `title.ilike.${pattern}`,
          `district.ilike.${pattern}`,
          `city.ilike.${pattern}`,
          `address.ilike.${pattern}`,
          `id.ilike.${pattern}`,
        ].join(","),
      );
    }
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "area-desc":
      query = query.order("area_sqm", { ascending: false });
      break;
    case "views-desc":
      query = query.order("views_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  return rows<Listing>(await query, "İlan listesi");
}

export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = await createClient();

  return maybeRow<Listing>(
    await supabase.from("listings").select("*").eq("id", id).maybeSingle(),
    "İlan",
  );
}

/** Aynı ilçedeki diğer ilanlar — detay sayfasının alt bölümü. */
export async function getRelatedListings(
  listing: Listing,
  limit = 3,
): Promise<Listing[]> {
  const supabase = await createClient();

  return rows<Listing>(
    await supabase
      .from("listings")
      .select("*")
      .eq("district", listing.district)
      .eq("status", "aktif")
      .neq("id", listing.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    "Benzer ilanlar",
  );
}

/* ==========================================================================
   Toplu sorgular (dashboard)
   ==========================================================================
   Her fonksiyon bir ekran parçasına karşılık gelir ve hesabı KENDİ İÇİNDE
   bitirir — çağıran sayfa aggregate hesaplamaz.

   HEPSİ TEK BİR SORGUYU PAYLAŞIR. Önceki sürümde dört fonksiyon altı ayrı
   istek atıyordu: iki `head: true` sayım, bir `created_at` listesi, bir
   `category`, bir `status`, bir de `price, area_sqm, category`. Hepsi AYNI
   TABLONUN aynı satırlarını okuyordu; fark yalnızca hangi kolonu istediğiydi.

   Ölçüm bunun neden pahalı olduğunu gösterdi: tek bir sorgunun süresi
   ~110-180 ms ve bu sürenin neredeyse tamamı ağ turu — 46 satır getirmek
   (146 ms) ile tek bir sayı getirmek (183 ms) arasında fark yok. Yani maliyet
   veride değil, İSTEK SAYISINDA.

   Artık tek istek beş kolon çekiyor ve dördü de onun üzerinden hesaplanıyor.
   `cache()` istek kapsamlı: dashboard'ın üç bölümü aynı render'da bu veriyi
   ayrı ayrı istese de ağa bir kez çıkılır.

   Tablolar on binlere çıktığında bu gövde bir `rpc()` çağrısına dönüşecek —
   imzalar o zaman da değişmeyecek.
   ========================================================================== */

/** Dashboard hesaplarının tamamı için gereken en dar kolon kümesi. */
type ListingFacts = {
  created_at: string;
  status: ListingStatus;
  category: ListingCategory;
  price: number;
  area_sqm: number;
};

const getListingFacts = cache(async function getListingFacts(): Promise<
  ListingFacts[]
> {
  const supabase = await createClient();

  return rows<ListingFacts>(
    await supabase
      .from("listings")
      .select("created_at, status, category, price, area_sqm"),
    "İlan toplamları",
  );
});

export type ListingStats = {
  totalListings: StatMetric;
  /** Yayında olan ilan adedi — toplam kartının alt metninde gösterilir. */
  activeListings: number;
};

/**
 * İlan sayımları.
 *
 * FAZ 8'DE DARALDI: bu fonksiyon Faz 3'ten beri satış cirosu ve bekleyen
 * teklif sayısını da döndürüyordu. O zaman gerekçesi vardı — `sales` ve
 * `offers` yalnızca dashboard'ı besliyordu, kendi modülleri yoktu. Satışlar
 * modülü gelince o hesaplar `data/sales.ts` içindeki `getSalesStats()`e
 * taşındı; burada yalnızca ilanlara ait olan kaldı.
 */
export async function getListingStats(): Promise<ListingStats> {
  const facts = await getListingFacts();
  const now = Date.now();

  const createdAt = facts.map((row) => Date.parse(row.created_at));

  return {
    totalListings: {
      value: facts.length,
      delta: percentChange(
        countWithin(createdAt, now - 30 * DAY, now + DAY),
        countWithin(createdAt, now - 60 * DAY, now - 30 * DAY),
      ),
      trend: countPerMonth(createdAt, 6, now),
    },
    activeListings: facts.filter((row) => row.status === "aktif").length,
  };
}

export type CategoryBreakdown = {
  category: ListingCategory;
  count: number;
  /** 0–1 arası pay. */
  share: number;
};

/** Etiketler bilinçli olarak yok — sözlük `lib/listings.ts` içinde durur. */
export async function getListingsByCategory(): Promise<CategoryBreakdown[]> {
  const facts = await getListingFacts();

  const counts = new Map<ListingCategory, number>();
  for (const row of facts) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  const total = facts.length || 1;

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

export type StatusBreakdown = {
  status: ListingStatus;
  count: number;
  /** 0–1 arası pay. */
  share: number;
};

export async function getListingsByStatus(): Promise<StatusBreakdown[]> {
  const facts = await getListingFacts();

  const counts = new Map<ListingStatus, number>();
  for (const row of facts) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  const total = facts.length || 1;

  return [...counts.entries()]
    .map(([status, count]) => ({ status, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

export type PortfolioTotals = {
  /** Satılık portföyün toplam değeri (TRY). */
  salesValue: number;
  /** Kiralık ilanların toplam aylık kira bedeli (TRY). */
  monthlyRentValue: number;
  /** Ortalama m² fiyatı (TRY) — arsa hariç. */
  averagePricePerSqm: number;
  /** Portföydeki toplam alan (m²). */
  totalArea: number;
};

/**
 * Portföy toplamları.
 *
 * Kiralıklar satış değerine KATILMAZ: aylık kira bedeliyle satış fiyatını
 * toplamak anlamsız bir sayı üretir. İki metrik ayrı raporlanır.
 *
 * Ortalama m² fiyatı ayrıca arsayı da dışarıda bırakır: 1.500 m²'lik bir
 * arsa m² başına konutun onda biri ederken paydayı domine eder ve ortalamayı
 * hiçbir gerçek ilanı temsil etmeyen bir sayıya çeker.
 */
export async function getPortfolioTotals(): Promise<PortfolioTotals> {
  const facts = await getListingFacts();

  const forSale = facts.filter((row) => row.category !== "kiralik");
  const forRent = facts.filter((row) => row.category === "kiralik");
  const built = forSale.filter((row) => row.category !== "arsa");

  const builtValue = built.reduce((sum, row) => sum + row.price, 0);
  const builtArea = built.reduce((sum, row) => sum + row.area_sqm, 0);

  return {
    salesValue: forSale.reduce((sum, row) => sum + row.price, 0),
    monthlyRentValue: forRent.reduce((sum, row) => sum + row.price, 0),
    averagePricePerSqm: builtArea === 0 ? 0 : Math.round(builtValue / builtArea),
    totalArea: facts.reduce((sum, row) => sum + row.area_sqm, 0),
  };
}
