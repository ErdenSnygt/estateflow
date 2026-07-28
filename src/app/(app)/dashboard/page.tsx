import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { getSession } from "@/lib/auth/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { KpiSection } from "@/components/dashboard/kpi-section";
import { SalesSection } from "@/components/dashboard/sales-section";
import { InsightsSection } from "@/components/dashboard/insights-section";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import {
  InsightsSkeleton,
  KpiGridSkeleton,
  SalesChartSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getSession();
  /* Middleware oturumsuz isteği zaten login'e yolluyor; yedek yalnızca
     oturumun tam bu render sırasında düşmesi ihtimaline karşı. */
  const firstName = (session?.name ?? "Merhaba").split(" ")[0];

  /* Üç bölüm ayrı Suspense sınırında: KPI'lar hazır olur olmaz görünür,
     grafikler arkadan akar. Veri çekimleri yine de paralel başlar — üç
     bölüm de aynı render geçişinde çağrılıyor, bekleme birikmiyor. */
  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={`Hoş geldin ${firstName} 👋`}
        description="Portföyünüzün bugünkü durumu, satış performansı ve ekibin son hareketleri."
        actions={
          <Button asChild>
            <Link href="/ilanlar/yeni">
              <Plus className="size-4" />
              Yeni ilan
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<KpiGridSkeleton />}>
        <KpiSection />
      </Suspense>

      {/* Bugün randevu yoksa kart hiç çizilmiyor; iskelet de o yüzden tek
          satırlık — yer tutup sonra kaybolan bir blok, sayfayı zıplatırdı. */}
      <Suspense fallback={<Skeleton className="h-4 w-40" />}>
        <TodayAppointments />
      </Suspense>

      <Suspense fallback={<SalesChartSkeleton />}>
        <SalesSection />
      </Suspense>

      <Suspense fallback={<InsightsSkeleton />}>
        <InsightsSection />
      </Suspense>
    </div>
  );
}
