import type {
  Agent,
  Customer,
  CustomerEvent,
  CustomerStatus,
  InterestIntent,
  Listing,
} from "@/types/database";
import type { CustomerSortKey } from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";
import { counted, maybeRow, rows, sanitizeSearch } from "@/lib/data/query";
import {
  DAY,
  countPerMonth,
  countWithin,
  percentChange,
  type StatMetric,
} from "@/lib/data/stats";

/**
 * ============================================================================
 * MÜŞTERİ VERİ ERİŞİMİ
 * ============================================================================
 * `data/listings.ts` ile aynı sözleşme; imzalar Faz 4'ten beri aynı.
 *
 * Faz 4'te bu dosya `listings.ts`'i import etmek zorundaydı (ilişkiyi bellekte
 * kurmak için) ve bu yüzden `getInterestedCustomers` mantıken İlanlar'a ait
 * olmasına rağmen burada duruyordu. Supabase'e geçişle o zorunluluk kalktı:
 * ilişki artık veritabanında, iki modül birbirini tanımıyor. Fonksiyon yine de
 * burada — ilişki tablosunun okunduğu yer tek olsun.
 */

/* ==========================================================================
   Sorgu arayüzü
   ========================================================================== */

export type CustomerFilters = {
  status?: CustomerStatus;
  agent?: string;
  minBudget?: number;
  maxBudget?: number;
  search?: string;
  sort?: CustomerSortKey;
};

/**
 * Liste kartının ihtiyacı: müşteri + ilgilendiği ilan sayısı.
 *
 * TAM `Customer` DEĞİL, açık bir alt küme. Kart `notes`, `email` ve
 * `updated_at` alanlarını hiç göstermiyor; tip onları da içerseydi sorgu da
 * onları çekmek ZORUNDA kalırdı (şema generic'i bunu derleme zamanında
 * denetliyor). Alan listesi burada daraldığı için sorgu da daralabildi.
 */
export type CustomerListItem = Pick<
  Customer,
  | "id"
  | "full_name"
  | "phone"
  | "avatar_url"
  | "budget_min"
  | "budget_max"
  | "status"
  | "assigned_agent_id"
  | "last_contact_at"
  | "created_at"
> & { interest_count: number };

/** PostgREST ilişki sayımı `[{ count: n }]` biçiminde döner. */
type CountEmbed = { count: number }[];

export async function getCustomers(
  filters: CustomerFilters = {},
): Promise<CustomerListItem[]> {
  const supabase = await createClient();

  /* İlgi sayısı ayrı bir sorgu değil, gömülü sayım: PostgREST ilişkili
     tabloyu `count` ile isteyince tek turda geliyor. */
  /* Kart yalnızca bu alanları gösteriyor. `select("*")` ayrıca `notes`
     (1000 karaktere kadar), `email` ve zaman damgalarını da taşıyordu —
     64 kayıtta boşuna onlarca kilobayt. */
  let query = supabase
    .from("customers")
    .select(
      "id, full_name, phone, avatar_url, budget_min, budget_max, status, assigned_agent_id, last_contact_at, created_at, interests:customer_listing_interests(count)",
    );

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.agent) query = query.eq("assigned_agent_id", filters.agent);

  /* Bütçe filtresi aralık KESİŞİMİ arar: 5–10 Mn arayan bir kullanıcı,
     bütçesi 8–14 Mn olan müşteriyi de görmeli. */
  if (filters.minBudget !== undefined) {
    query = query.gte("budget_max", filters.minBudget);
  }
  if (filters.maxBudget !== undefined) {
    query = query.lte("budget_min", filters.maxBudget);
  }

  if (filters.search) {
    const needle = sanitizeSearch(filters.search);
    if (needle) {
      const pattern = `%${needle}%`;
      query = query.or(
        [
          `full_name.ilike.${pattern}`,
          `phone.ilike.${pattern}`,
          `email.ilike.${pattern}`,
          `id.ilike.${pattern}`,
        ].join(","),
      );
    }
  }

  switch (filters.sort) {
    case "name":
      query = query.order("full_name", { ascending: true });
      break;
    case "budget-desc":
      query = query.order("budget_max", { ascending: false });
      break;
    case "budget-asc":
      query = query.order("budget_min", { ascending: true });
      break;
    case "interest-desc":
      /* İlgi sayısı gömülü bir aggregate; PostgREST ona göre sıralayamaz.
         Sabit bir ikincil sıra veriyoruz, asıl sıralama aşağıda. */
      query = query.order("full_name", { ascending: true });
      break;
    default:
      /* Hiç görüşülmemişler en sona. */
      query = query.order("last_contact_at", {
        ascending: false,
        nullsFirst: false,
      });
  }

  const data = rows<
    Omit<CustomerListItem, "interest_count"> & { interests: CountEmbed }
  >(await query, "Müşteri listesi");

  const items = data.map(({ interests, ...customer }) => ({
    ...customer,
    interest_count: interests[0]?.count ?? 0,
  }));

  if (filters.sort === "interest-desc") {
    items.sort((a, b) => b.interest_count - a.interest_count);
  }

  return items;
}

/** Kart ve listelerde gösterilecek kadarı — tam `Listing` taşımaya gerek yok. */
export type ListingSummary = Pick<
  Listing,
  | "id"
  | "title"
  | "price"
  | "currency"
  | "category"
  | "status"
  | "city"
  | "district"
  | "area_sqm"
  | "room_count"
> & { image: string | null };

/** Gömülü ilan seçimi — `ListingSummary` alanları + kapak için `images`. */
const LISTING_EMBED =
  "id, title, price, currency, category, status, city, district, area_sqm, room_count, images";

function toSummary(listing: Listing): ListingSummary {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    category: listing.category,
    status: listing.status,
    city: listing.city,
    district: listing.district,
    area_sqm: listing.area_sqm,
    room_count: listing.room_count,
    image: listing.images[0] ?? null,
  };
}

/**
 * Detay sayfasının ihtiyacı olan her şey tek çağrıda — müşteri, sorumlu
 * danışman ve ilgilendiği ilanlar tek bir iç içe select ile geliyor.
 */
export type CustomerDetail = Customer & {
  interests: ListingSummary[];
  agent: Agent | null;
};

export async function getCustomerById(
  id: string,
): Promise<CustomerDetail | null> {
  const supabase = await createClient();

  const row = maybeRow<
    Customer & {
      agent: Agent | null;
      interests: { intent: InterestIntent; listing: Listing | null }[];
    }
  >(
    await supabase
      .from("customers")
      .select(
        `*, agent:agents(id, full_name, initials, role, email, phone), interests:customer_listing_interests(intent, listing:listings(${LISTING_EMBED}))`,
      )
      .eq("id", id)
      .maybeSingle(),
    "Müşteri detayı",
  );

  if (!row) return null;

  const { interests, agent, ...customer } = row;

  return {
    ...customer,
    agent,
    interests: interests
      .map((entry) => entry.listing)
      .filter((listing): listing is Listing => listing !== null)
      .map(toSummary),
  };
}

/**
 * İlişkinin ters yönü — ilan detayında "bu ilanla ilgilenen müşteriler".
 *
 * Kiralık ilanlar da doğru sonuç verir: eşleşme artık bütçe aritmetiğine
 * değil, ilişki satırındaki `intent` alanına dayanıyor.
 */
export async function getInterestedCustomers(
  listingId: string,
): Promise<Customer[]> {
  const supabase = await createClient();

  const data = rows<{ customer: Customer | null }>(
    await supabase
      .from("customer_listing_interests")
      .select("customer:customers(*)")
      .eq("listing_id", listingId),
    "İlgilenen müşteriler",
  );

  return data
    .map((entry) => entry.customer)
    .filter((customer): customer is Customer => customer !== null)
    .sort(
      (a, b) =>
        Date.parse(b.last_contact_at ?? "1970-01-01") -
        Date.parse(a.last_contact_at ?? "1970-01-01"),
    );
}

/**
 * Tarihe göre artan sırada — çizelge yukarıdan aşağı okunur.
 *
 * Kolon adları tabloda `event_type` / `description` / `occurred_at`; PostgREST
 * takma adlarıyla `CustomerEvent` şekline çevriliyor, böylece
 * `CustomerTimeline` bileşeni Faz 4'ten beri değişmedi.
 */
export async function getCustomerTimeline(
  customerId: string,
): Promise<CustomerEvent[]> {
  const supabase = await createClient();

  return rows<CustomerEvent>(
    await supabase
      .from("customer_timeline_events")
      .select(
        "id, customer_id, type:event_type, listing_id, note:description, created_at:occurred_at",
      )
      .eq("customer_id", customerId)
      .order("occurred_at", { ascending: true }),
    "Müşteri zaman çizelgesi",
  );
}

/* ==========================================================================
   Toplu sorgular (dashboard)
   ========================================================================== */

/** Dashboard KPI'ı. Satır aktarılmaz, yalnızca sayım döner. */
export async function getCustomerCount(): Promise<number> {
  const supabase = await createClient();

  return counted(
    await supabase.from("customers").select("id", { count: "exact", head: true }),
    "Müşteri sayısı",
  );
}

/**
 * Dashboard'daki "Toplam Müşteri" kartı — değer, yüzde değişim ve trend.
 * Faz 3'te bu sabit bir sayıydı ve trendi uydurmaydı; Faz 4'te gerçek
 * `created_at` dağılımına bağlandı, Faz 5'te veri de gerçek oldu.
 */
export async function getCustomerStats(): Promise<StatMetric> {
  const supabase = await createClient();
  const now = Date.now();

  /* TEK SORGU: önceki sürümde ayrıca bir `head: true` sayım vardı ama satır
     listesi zaten geliyor — `length` aynı sayıyı veriyor ve bir ağ turu
     kazanıyoruz. Ölçüm, tek satırlık bir sayımın 46 satırlık bir listeden
     daha ucuz OLMADIĞINI gösterdi: maliyet turun kendisinde. */
  const createdAt = rows<{ created_at: string }>(
    await supabase.from("customers").select("created_at"),
    "Müşteri tarihleri",
  ).map((row) => Date.parse(row.created_at));

  return {
    value: createdAt.length,
    delta: percentChange(
      countWithin(createdAt, now - 30 * DAY, now + DAY),
      countWithin(createdAt, now - 60 * DAY, now - 30 * DAY),
    ),
    trend: countPerMonth(createdAt, 6, now),
  };
}

export type CustomerStatusBreakdown = {
  status: CustomerStatus;
  count: number;
};

export async function getCustomersByStatus(): Promise<
  CustomerStatusBreakdown[]
> {
  const supabase = await createClient();

  const data = rows<{ status: CustomerStatus }>(
    await supabase.from("customers").select("status"),
    "Müşteri durum dağılımı",
  );

  const counts = new Map<CustomerStatus, number>();
  for (const row of data) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}
