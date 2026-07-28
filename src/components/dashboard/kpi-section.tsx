import { getListingStats } from "@/lib/data/listings";
import { getSalesStats } from "@/lib/data/sales";
import { getCustomerStats } from "@/lib/data/customers";
import { formatNumber } from "@/lib/format";
import { KpiCard, type KpiCardProps } from "@/components/dashboard/kpi-card";

/**
 * KPI şeridi. Hesap veri katmanında yapılır, burada yalnızca sunuma
 * çevrilir — Supabase'e geçişte bu dosya değişmeyecek.
 *
 * Üç modülden veri geliyor (ilan, müşteri, satış); paralel çağrılıyorlar.
 * Faz 8'e kadar satış ve teklif sayıları `getListingStats()` içinden geliyordu;
 * Satışlar modülü açılınca kendi veri katmanına taşındılar.
 */
export async function KpiSection() {
  const [stats, salesStats, customerStats] = await Promise.all([
    getListingStats(),
    getSalesStats(),
    getCustomerStats(),
  ]);

  const cards: KpiCardProps[] = [
    {
      icon: "listings",
      label: "Toplam İlan",
      value: stats.totalListings.value,
      format: "number",
      delta: stats.totalListings.delta,
      trend: stats.totalListings.trend,
      hint: `${stats.activeListings} ilan yayında`,
      accent: 0,
    },
    {
      icon: "customers",
      label: "Toplam Müşteri",
      value: customerStats.value,
      format: "number",
      delta: customerStats.delta,
      trend: customerStats.trend,
      hint: "kayıtlı müşteri",
      accent: 1,
    },
    {
      icon: "revenue",
      label: "Bu Ay Satış",
      value: salesStats.monthlyRevenue.value,
      format: "currency",
      delta: salesStats.monthlyRevenue.delta,
      trend: salesStats.monthlyRevenue.trend,
      hint: `${formatNumber(salesStats.monthlySales)} işlem kapandı`,
      accent: 2,
    },
    {
      icon: "offers",
      label: "Bekleyen Teklif",
      value: salesStats.pendingOffers.value,
      format: "number",
      delta: salesStats.pendingOffers.delta,
      trend: salesStats.pendingOffers.trend,
      hint: "yanıt bekliyor",
      accent: 3,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <KpiCard key={card.label} {...card} index={index} />
      ))}
    </div>
  );
}
