import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";

import { getSession } from "@/lib/auth/server";
import { greetingPeriod } from "@/lib/greeting";
import { PageHeader } from "@/components/page-header";
import { DashboardGreeting } from "@/components/dashboard/greeting";
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
import { WriteLink } from "@/components/demo/write-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard.label") };
}

export default async function DashboardPage() {
  const [session, t] = await Promise.all([
    getSession(),
    getTranslations("dashboard"),
  ]);

  /* Middleware oturumsuz isteği zaten login'e yolluyor; yedek yalnızca
     oturumun tam bu render sırasında düşmesi ihtimaline karşı. Yedek ad
     `common.fallbackUserName` üzerinden çeviriden geliyor — selamlama
     "Hoş geldin Kullanıcı" diye okunsun, boş kalmasın. */
  const fallback = await getTranslations("common");
  const tListings = await getTranslations("listings");
  const firstName = (session?.name ?? fallback("fallbackUserName")).split(" ")[0];

  /* Üç bölüm ayrı Suspense sınırında: KPI'lar hazır olur olmaz görünür,
     grafikler arkadan akar. Veri çekimleri yine de paralel başlar — üç
     bölüm de aynı render geçişinde çağrılıyor, bekleme birikmiyor. */
  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={
          <DashboardGreeting
            name={firstName}
            fallbackPeriod={greetingPeriod(new Date().getHours())}
          />
        }
        description={t("description")}
        actions={
          <Button asChild>
            <WriteLink href="/ilanlar/yeni">
              <Plus className="size-4" />
              {tListings("new")}
            </WriteLink>
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
