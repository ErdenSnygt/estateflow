import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  getListingsByCategory,
  getListingsByStatus,
  getPortfolioTotals,
} from "@/lib/data/listings";
import { getRecentActivity } from "@/lib/data/activity";
import { formatArea, formatCurrency, formatCurrencyCompact } from "@/lib/format";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { StatusBreakdown } from "@/components/dashboard/status-breakdown";
import { RecentActivity } from "@/components/dashboard/recent-activity";

/**
 * Dört bağımsız sorgu — `Promise.all` ile paralel. Sıralı `await` yazılsaydı
 * mock gecikme (ve gerçek sorgu süresi) üst üste binerdi.
 */
export async function InsightsSection() {
  const [categories, statuses, totals, activity] = await Promise.all([
    getListingsByCategory(),
    getListingsByStatus(),
    getPortfolioTotals(),
    getRecentActivity(7),
  ]);

  const figures = [
    {
      label: "Satılık portföy değeri",
      value: formatCurrencyCompact(totals.salesValue),
    },
    {
      label: "Aylık kira potansiyeli",
      value: formatCurrencyCompact(totals.monthlyRentValue),
    },
    {
      label: "Ort. m² fiyatı (arsa hariç)",
      value: formatCurrency(totals.averagePricePerSqm),
    },
    { label: "Toplam alan", value: formatArea(totals.totalArea) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Portföy Dağılımı</CardTitle>
          <CardDescription>Kategori, yayın durumu ve değer özeti</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          <CategoryChart data={categories} />

          <div className="space-y-3 border-t border-hairline pt-4">
            <p className="text-[12.5px] font-medium text-secondary-foreground">
              Yayın durumu
            </p>
            <StatusBreakdown data={statuses} />
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-hairline pt-4">
            {figures.map((figure) => (
              <div
                key={figure.label}
                className="rounded-lg bg-surface-inset px-3 py-2.5"
              >
                <p className="text-[11.5px] leading-tight text-muted-foreground">
                  {figure.label}
                </p>
                <p className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">
                  {figure.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Son Aktiviteler</CardTitle>
          <CardDescription>Ekibin son hareketleri</CardDescription>
          <CardAction>
            <Link
              href="/ilanlar"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-secondary-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              İlanlar
              <ArrowRight className="size-3.5" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pt-3">
          <RecentActivity items={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
