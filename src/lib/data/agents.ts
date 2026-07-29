import type { Agent } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { counted, maybeRow, rows } from "@/lib/data/query";
import { monthStartUtc } from "@/lib/data/stats";
import { getAgentSalesTotal } from "@/lib/data/sales";

/**
 * ============================================================================
 * PERSONEL VERİ ERİŞİMİ
 * ============================================================================
 * Faz 5'e kadar burada sabit bir dizi vardı; artık `agents` tablosundan
 * geliyor. Faz 6'da performans toplamları eklendi.
 *
 * Bu dosya `next/headers`e bağlı sunucu istemcisini kullanıyor, yani istemci
 * bileşeninden import EDİLEMEZ — seçenekler sunucu sayfasında hazırlanıp
 * filtre çubuğuna prop olarak geçiriliyor. Rol etiketleri ve yetki soruları
 * ise `lib/agents.ts` içinde, o dosya her iki taraftan da kullanılabilir.
 *
 * RLS BURADA GÖRÜNMEZ AMA ETKİLİDİR: `getAgents()` bir yönetici için tüm
 * ekibi, bir danışman için yalnızca kendi kaydını döndürür — sorgu aynı,
 * politika farklı. Bu yüzden "danışman seç" açılırı ayrıca filtrelenmiyor.
 */

const COLUMNS =
  "id, full_name, initials, title, role, email, phone, user_id, avatar_url, cover_url, commission_rate, is_active, notification_preferences, created_at";

export async function getAgents(): Promise<Agent[]> {
  const supabase = await createClient();

  return rows(
    await supabase.from("agents").select(COLUMNS).order("full_name"),
    "Personel listesi",
  );
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const supabase = await createClient();

  return maybeRow(
    await supabase.from("agents").select(COLUMNS).eq("id", id).maybeSingle(),
    "Personel",
  );
}

export type AgentOption = { value: string; label: string };

/** Filtre ve form açılırları için hafif seçenek listesi. */
export async function getAgentOptions(): Promise<AgentOption[]> {
  const agents = await getAgents();
  return agents.map((agent) => ({ value: agent.id, label: agent.full_name }));
}

/* ==========================================================================
   Performans
   ========================================================================== */

/**
 * Bir personelin sayıları.
 *
 * TANIMLAR — hepsi bilinçli ve basit:
 *  · Aktif müşteri : durumu "soğuk" OLMAYAN atanmış müşteriler. Soğuk müşteri
 *    portföyde durur ama üzerinde çalışılmıyordur; "aktif" sayısına katmak
 *    kimin gerçekten meşgul olduğunu gizlerdi.
 *  · Aktif ilan    : durumu "aktif" olan ilanlar (taslak ve pasif hariç).
 *  · Bu ay         : içinde bulunulan TAKVİM ayı, UTC. Son 30 gün değil —
 *    "bu ay ne yaptım" sorusunun karşılığı ay başından bugüne.
 *  · Prim          : bu ayki ciro × `agents.commission_rate`.
 */
export type AgentPerformance = {
  agentId: string;
  activeCustomers: number;
  totalCustomers: number;
  activeListings: number;
  totalListings: number;
  /** Bu ay kapanan işlem adedi. */
  monthlySales: number;
  /** Bu ay kapanan işlemlerin toplamı (TRY). */
  monthlyRevenue: number;
  /** Bu ayki prim (TRY). */
  monthlyCommission: number;
  /** Tüm zamanların cirosu (TRY) — detay sayfasındaki "toplam satış". */
  totalRevenue: number;
  totalSales: number;
};

/** Ay sınırı `data/stats.ts` içinde; satış modülü de aynı sınırı kullanıyor. */
const monthStart = () => monthStartUtc(Date.now());

function emptyPerformance(agentId: string): AgentPerformance {
  return {
    agentId,
    activeCustomers: 0,
    totalCustomers: 0,
    activeListings: 0,
    totalListings: 0,
    monthlySales: 0,
    monthlyRevenue: 0,
    monthlyCommission: 0,
    totalRevenue: 0,
    totalSales: 0,
  };
}

/**
 * Tek personelin performansı — detay sayfası için.
 *
 * Beş sorgu tek turda: dördü `head: true` sayım (satır aktarılmaz), biri
 * satış tutarlarını çeker. Toplama JavaScript'te yapılıyor; gerekçe
 * `data/stats.ts` başlığında (PostgREST aggregate desteği projeye göre kapalı
 * olabiliyor, satır sayısı ise birkaç yüz).
 */
export async function getAgentPerformance(
  agentId: string,
): Promise<AgentPerformance> {
  const supabase = await createClient();

  const [agent, totalCustomers, activeCustomers, totalListings, activeListings, sales] =
    await Promise.all([
      supabase
        .from("agents")
        .select("commission_rate")
        .eq("id", agentId)
        .maybeSingle(),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("assigned_agent_id", agentId),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("assigned_agent_id", agentId)
        .neq("status", "soguk"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", agentId),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "aktif"),
      /* Satış toplamları Satışlar modülünden geliyor — ciro mantığı tek
         yerde dursun. Prim çarpımı burada kalıyor çünkü oran `agents`
         tablosunda. */
      getAgentSalesTotal(agentId),
    ]);

  const rate =
    maybeRow(agent, "Personel prim oranı")?.commission_rate ?? 0;

  const result = emptyPerformance(agentId);
  result.totalCustomers = counted(totalCustomers, "Personel müşteri sayısı");
  result.activeCustomers = counted(activeCustomers, "Personel aktif müşteri");
  result.totalListings = counted(totalListings, "Personel ilan sayısı");
  result.activeListings = counted(activeListings, "Personel aktif ilan");
  result.totalSales = sales.totalSales;
  result.totalRevenue = sales.totalRevenue;
  result.monthlySales = sales.monthlySales;
  result.monthlyRevenue = sales.monthlyRevenue;

  result.monthlyCommission = Math.round(result.monthlyRevenue * rate);
  return result;
}

/**
 * Tüm ekibin performansı — liste sayfası için.
 *
 * `getAgentPerformance`ı personel başına çağırmak 7 kişide 35 sorgu ederdi.
 * Bunun yerine üç geniş sorgu çekilip gruplama bellekte yapılıyor; satır
 * sayısı (ilan + müşteri + satış) birkaç yüzü geçmiyor ve hepsi zaten RLS ile
 * çağıranın görebildiği kadarıyla sınırlı.
 *
 * `agents` parametre olarak alınıyor: çağıran sayfa listeyi zaten çekmiş
 * durumda ve prim oranı orada — ikinci kez sormaya gerek yok.
 */
export async function getAgentPerformances(
  agents: Agent[],
): Promise<Map<string, AgentPerformance>> {
  const supabase = await createClient();
  const since = monthStart();

  const [customers, listings, sales] = await Promise.all([
    supabase.from("customers").select("assigned_agent_id, status"),
    supabase.from("listings").select("agent_id, status"),
    supabase.from("sales").select("agent_id, amount, closed_at"),
  ]);

  const byAgent = new Map(
    agents.map((agent) => [agent.id, emptyPerformance(agent.id)]),
  );

  for (const row of rows(customers, "Ekip müşteri dağılımı")) {
    const entry = byAgent.get(row.assigned_agent_id);
    if (!entry) continue;
    entry.totalCustomers += 1;
    if (row.status !== "soguk") entry.activeCustomers += 1;
  }

  for (const row of rows(listings, "Ekip ilan dağılımı")) {
    const entry = byAgent.get(row.agent_id);
    if (!entry) continue;
    entry.totalListings += 1;
    if (row.status === "aktif") entry.activeListings += 1;
  }

  for (const row of rows(sales, "Ekip satışları")) {
    if (!row.agent_id) continue;
    const entry = byAgent.get(row.agent_id);
    if (!entry) continue;
    entry.totalSales += 1;
    entry.totalRevenue += row.amount;
    if (Date.parse(row.closed_at) >= since) {
      entry.monthlySales += 1;
      entry.monthlyRevenue += row.amount;
    }
  }

  for (const agent of agents) {
    const entry = byAgent.get(agent.id);
    if (!entry) continue;
    entry.monthlyCommission = Math.round(
      entry.monthlyRevenue * agent.commission_rate,
    );
  }

  return byAgent;
}
