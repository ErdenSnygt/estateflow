import { getTranslations } from "next-intl/server";

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
  const [stats, salesStats, customerStats, t] = await Promise.all([
    getListingStats(),
    getSalesStats(),
    getCustomerStats(),
    getTranslations("dashboard.kpi"),
  ]);

  const cards: KpiCardProps[] = [
    {
      icon: "listings",
      label: t("totalListings"),
      value: stats.totalListings.value,
      format: "number",
      delta: stats.totalListings.delta,
      trend: stats.totalListings.trend,
      hint: t("hintPublished", { count: stats.activeListings }),
      accent: 0,
    },
    {
      icon: "customers",
      label: t("totalCustomers"),
      value: customerStats.value,
      format: "number",
      delta: customerStats.delta,
      trend: customerStats.trend,
      hint: t("hintCustomers"),
      accent: 1,
    },
    {
      icon: "revenue",
      label: t("monthlySales"),
      value: salesStats.monthlyRevenue.value,
      format: "currency",
      delta: salesStats.monthlyRevenue.delta,
      trend: salesStats.monthlyRevenue.trend,
      hint: t("hintDeals", { count: formatNumber(salesStats.monthlySales) }),
      accent: 2,
    },
    {
      icon: "offers",
      label: t("pendingOffers"),
      value: salesStats.pendingOffers.value,
      format: "number",
      delta: salesStats.pendingOffers.delta,
      trend: salesStats.pendingOffers.trend,
      hint: t("hintOffers"),
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
