import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Heart, Medal } from "lucide-react";

import {
  getListingsByCategory,
  getListingsByStatus,
  getTopListings,
} from "@/lib/data/listings";
import { getAgentPerformances, getAgents } from "@/lib/data/agents";
import { getRevenueOverview } from "@/lib/data/revenue";
import { getCurrentAgent } from "@/lib/auth/server";
import { isManagerRole } from "@/lib/agents";
import { STATUS_LABELS } from "@/lib/listings";
import {
  DEFAULT_PERIOD,
  PERIOD_OPTIONS,
  periodDays,
  periodLabel,
  type PeriodValue,
} from "@/lib/revenue";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
} from "@/lib/format";
import { oneOf, type SearchParamsInput } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/animated-number";
import { PageHeader } from "@/components/page-header";
import { AgentNotice } from "@/components/layout/agent-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { PeriodTabs } from "@/components/revenue/period-tabs";
import { TrendChart } from "@/components/reports/trend-chart";

export const metadata: Metadata = {
  title: "Raporlar",
};

type PageProps = { searchParams: Promise<SearchParamsInput> };

/**
 * ============================================================================
 * RAPORLAR
 * ============================================================================
 * BİLEREK HAFİF. Bu bir analitik ürünü değil; mevcut verinin okunabilir bir
 * özeti. Kohort analizi, huni, segment kırılımı, özel metrik tanımlama gibi
 * şeyler yok — hiçbiri bu uygulamanın topladığı veriden anlamlı biçimde
 * çıkarılamaz (olay takibi yok, yalnızca kayıt durumları var).
 *
 * -----------------------------------------------------------------------------
 * YENİ VERİ MANTIĞI YAZILMADI
 * -----------------------------------------------------------------------------
 * Sayfa mevcut fonksiyonların BİR ARAYA GETİRİLMESİ:
 *
 *   getListingsByCategory / getListingsByStatus  → Faz 3 (dashboard)
 *   getAgentPerformances                          → Faz 6 (personeller)
 *   getRevenueOverview                            → Faz 16 (gelirler)
 *
 * Tek yeni sorgu `getTopListings` ve o da mevcut desende: dar `select`,
 * Postgres tarafında sıralama, `rows()` sarmalayıcısı.
 *
 * Satış trendi Gelirler ile AYNI önbellekli sorgudan besleniyor
 * (`getCommissionRows`), yani bu sayfa için ayrı bir satış serisi sorgusu
 * açılmıyor.
 *
 * -----------------------------------------------------------------------------
 * ROL KONTROLÜ
 * -----------------------------------------------------------------------------
 * Ekip performansı bölümü yalnızca yöneticiye. Danışman için bölüm hiç
 * çizilmiyor — RLS zaten `getAgents()`i tek satıra indirirdi ve "sıralama"
 * tek kişilik olurdu, ama boş bir liderlik tablosu göstermek anlamsız.
 *
 * Portföy ve satış analizi herkese açık ama İÇERİĞİ ROLE GÖRE DARALIYOR:
 * danışmanın gördüğü sayılar RLS gereği zaten yalnızca kendi kayıtlarından
 * geliyor.
 */
export default async function RaporlarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period =
    oneOf<PeriodValue>(
      params,
      "d",
      PERIOD_OPTIONS.map((option) => option.value),
    ) ?? DEFAULT_PERIOD;

  const days = periodDays(period);

  const agent = await getCurrentAgent();

  if (!agent) {
    return (
      <div className="space-y-6 pb-4">
        <PageHeader
          title="Raporlar"
          description="Portföy, satış ve ekip performansı özeti."
        />
        <AgentNotice />
      </div>
    );
  }

  const isManager = isManagerRole(agent.role);

  /* Hepsi paralel. Ekip bölümü yalnızca yöneticide çekiliyor — danışman için
     iki gereksiz sorgu açmanın anlamı yok. */
  const [byCategory, byStatus, mostViewed, mostFavorited, revenue, team] =
    await Promise.all([
      getListingsByCategory(),
      getListingsByStatus(),
      getTopListings("views_count"),
      getTopListings("favorites_count"),
      getRevenueOverview(days),
      isManager
        ? getAgents().then(async (agents) => ({
            agents,
            performances: await getAgentPerformances(agents),
          }))
        : Promise.resolve(null),
    ]);

  const totalListings = byStatus.reduce((sum, row) => sum + row.count, 0);

  /* Liderlik tablosu: ciroya göre, yalnızca satışı olanlar. Sıfır satışlı
     danışmanı "sıralamada" göstermek onu cezalandırmak gibi okunuyor. */
  const leaderboard = team
    ? team.agents
        .map((member) => ({
          agent: member,
          performance: team.performances.get(member.id),
        }))
        .filter((row) => row.performance && row.performance.totalSales > 0)
        .sort(
          (a, b) =>
            (b.performance?.totalRevenue ?? 0) -
            (a.performance?.totalRevenue ?? 0),
        )
    : [];

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Raporlar"
        description="Portföyün dağılımı, dönem içindeki satış trendi ve ekip performansı."
        actions={<PeriodTabs current={period} />}
      />

      {/* ================================================================== */}
      {/* 1. Portföy analizi                                                 */}
      {/* ================================================================== */}
      <section className="space-y-3">
        <SectionTitle
          title="Portföy analizi"
          hint={`${formatNumber(totalListings)} ilan`}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Kategori dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {byCategory.length === 0 ? (
                <EmptyNote>Portföyde ilan yok.</EmptyNote>
              ) : (
                <CategoryChart data={byCategory} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Durum dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-3">
              {byStatus.length === 0 ? (
                <EmptyNote>Portföyde ilan yok.</EmptyNote>
              ) : (
                byStatus.map((row) => (
                  <div key={row.status} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="text-secondary-foreground">
                        {STATUS_LABELS[row.status]}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {row.count} · %{Math.round(row.share * 100)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.round(row.share * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopListingCard
            title="En çok görüntülenen"
            icon={<Eye className="size-4" />}
            listings={mostViewed}
            metric="views_count"
          />
          <TopListingCard
            title="En çok favorilenen"
            icon={<Heart className="size-4" />}
            listings={mostFavorited}
            metric="favorites_count"
          />
        </div>
      </section>

      {/* ================================================================== */}
      {/* 2. Satış analizi                                                    */}
      {/* ================================================================== */}
      <section className="space-y-3">
        <SectionTitle title="Satış analizi" hint={periodLabel(period)} />

        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat
            label="Kapanan işlem"
            value={<AnimatedNumber value={revenue.saleCount} />}
          />
          <MiniStat
            label="Satış hacmi"
            value={<AnimatedNumber value={revenue.volume} format="compact" />}
          />
          <MiniStat
            label="Ortalama işlem"
            value={
              revenue.saleCount > 0 ? (
                <AnimatedNumber
                  value={Math.round(revenue.volume / revenue.saleCount)}
                  format="compact"
                />
              ) : (
                "—"
              )
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Satış hacmi trendi</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {revenue.saleCount === 0 ? (
              <EmptyNote>
                {periodLabel(period)} içinde kapanan işlem yok. Daha geniş bir
                dönem seçebilirsiniz.
              </EmptyNote>
            ) : (
              <TrendChart data={revenue.series} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ================================================================== */}
      {/* 3. Ekip performansı — yalnızca yönetici                             */}
      {/* ================================================================== */}
      {isManager && (
        <section className="space-y-3">
          <SectionTitle
            title="Ekip performansı"
            hint="Tüm zamanlar"
            badge="Yönetici"
          />

          <Card>
            <CardContent className="space-y-2 p-4">
              {leaderboard.length === 0 ? (
                <EmptyNote>
                  Henüz satış kaydı olan danışman yok.
                </EmptyNote>
              ) : (
                leaderboard.map((row, index) => (
                  <Link
                    key={row.agent.id}
                    href={`/personeller/${row.agent.id}`}
                    className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2.5 transition-colors hover:bg-surface-hover"
                  >
                    {/* İlk üçe madalya; gerisi sıra numarası. */}
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
                        index === 0
                          ? "bg-warning-soft text-warning"
                          : index === 1
                            ? "bg-surface-active text-secondary-foreground"
                            : index === 2
                              ? "bg-brand-soft text-brand"
                              : "bg-surface-inset text-muted-foreground",
                      )}
                    >
                      {index < 3 ? <Medal className="size-3.5" /> : index + 1}
                    </span>

                    <AgentAvatar
                      name={row.agent.full_name}
                      initials={row.agent.initials}
                      src={row.agent.avatar_url}
                      size={36}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-foreground">
                        {row.agent.full_name}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {row.performance?.totalSales} işlem ·{" "}
                        {row.performance?.activeListings} aktif ilan ·{" "}
                        {row.performance?.activeCustomers} aktif müşteri
                      </p>
                    </div>

                    <p className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">
                      {formatCurrency(row.performance?.totalRevenue ?? 0)}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        Raporlar mevcut kayıtlardan anlık hesaplanır; ayrı bir analitik veri
        deposu tutulmaz. Gördüğünüz sayılar yetkiniz kapsamındaki kayıtlarla
        sınırlıdır.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SectionTitle({
  title,
  hint,
  badge,
}: {
  title: string;
  hint: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <span className="text-[12.5px] text-muted-foreground">{hint}</span>
      {badge && <Badge variant="outline">{badge}</Badge>}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-[12px] text-muted-foreground">{label}</p>
        <p className="text-[19px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function TopListingCard({
  title,
  icon,
  listings,
  metric,
}: {
  title: string;
  icon: React.ReactNode;
  listings: Awaited<ReturnType<typeof getTopListings>>;
  metric: "views_count" | "favorites_count";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-3">
        {listings.length === 0 ? (
          <EmptyNote>Gösterilecek ilan yok.</EmptyNote>
        ) : (
          listings.map((listing, index) => (
            <Link
              key={listing.id}
              href={`/ilanlar/${listing.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover"
            >
              <span className="w-4 shrink-0 text-[12px] tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {listing.title}
                </p>
                <p className="truncate text-[11.5px] text-muted-foreground">
                  {listing.district}, {listing.city} ·{" "}
                  {formatCurrencyCompact(listing.price, listing.currency)}
                </p>
              </div>
              <span className="shrink-0 text-[13px] font-medium tabular-nums text-secondary-foreground">
                {formatNumber(listing[metric])}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-4 text-center text-[13px] text-muted-foreground">
      {children}
    </p>
  );
}
