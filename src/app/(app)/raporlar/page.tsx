import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
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
import {
  DEFAULT_PERIOD,
  PERIOD_OPTIONS,
  periodDays,
  periodValue,
  type PeriodValue,
} from "@/lib/revenue";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
} from "@/lib/format";
import { formatPercent } from "@/i18n/numbers";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.page");
  return { title: t("title") };
}

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

  /* `getCurrentAgent()` ROL İÇİN gerekiyor ama portföy ve satış sorguları
     ondan bağımsız — beklemelerine gerek yok. Önceki sürüm önce rolü çözüp
     sonra beşini başlatıyordu; bu, sayfanın tamamını bir ağ turu kadar
     geciktiriyordu. `getCurrentAgent` istek başına önbellekli, yani aşağıda
     ikinci kez çağrılması ücretsiz. */
  const [
    agent,
    byCategory,
    byStatus,
    mostViewed,
    mostFavorited,
    revenue,
    tListings,
    t,
    tRevenue,
    format,
  ] = await Promise.all([
      getCurrentAgent(),
      getListingsByCategory(),
      getListingsByStatus(),
      getTopListings("views_count"),
      getTopListings("favorites_count"),
      getRevenueOverview(days),
      /* Paylaşılan ilan sözlüğü — durum etiketleri `lib/listings.ts`ten
         Faz 20'de çeviriye taşınmıştı. */
      getTranslations("listings"),
      getTranslations("reports"),
      /* Dönem etiketi Gelirler ile ORTAK: iki sayfa aynı `PeriodTabs`
         bileşenini ve aynı anahtarları kullanıyor. */
      getTranslations("revenue"),
      getFormatter(),
    ]);

  if (!agent) {
    return (
      <div className="space-y-6 pb-4">
        <PageHeader
          title={t("page.title")}
          description={t("page.noAgentDescription")}
        />
        <AgentNotice />
      </div>
    );
  }

  const isManager = isManagerRole(agent.role);

  /* Ekip bölümü ancak roller çözüldükten sonra başlayabiliyor ve yalnızca
     yöneticide çekiliyor — danışman için iki gereksiz sorgu açmanın anlamı
     yok. */
  const team = isManager
    ? await getAgents().then(async (agents) => ({
        agents,
        performances: await getAgentPerformances(agents),
      }))
    : null;

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
        title={t("page.title")}
        description={t("page.description")}
        actions={<PeriodTabs current={period} />}
      />

      {/* ================================================================== */}
      {/* 1. Portföy analizi                                                 */}
      {/* ================================================================== */}
      <section className="space-y-3">
        <SectionTitle
          title={t("portfolio.title")}
          hint={t("portfolio.hint", { count: formatNumber(totalListings) })}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("portfolio.byCategory")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {byCategory.length === 0 ? (
                <EmptyNote>{t("portfolio.empty")}</EmptyNote>
              ) : (
                <CategoryChart data={byCategory} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("portfolio.byStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-3">
              {byStatus.length === 0 ? (
                <EmptyNote>{t("portfolio.empty")}</EmptyNote>
              ) : (
                byStatus.map((row) => (
                  <div key={row.status} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="text-secondary-foreground">
                        {tListings(`status.${row.status}`)}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {row.count} · {formatPercent(format, row.share)}
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
            title={t("portfolio.mostViewed")}
            icon={<Eye className="size-4" />}
            listings={mostViewed}
            metric="views_count"
            emptyLabel={t("portfolio.noListings")}
          />
          <TopListingCard
            title={t("portfolio.mostFavorited")}
            icon={<Heart className="size-4" />}
            listings={mostFavorited}
            metric="favorites_count"
            emptyLabel={t("portfolio.noListings")}
          />
        </div>
      </section>

      {/* ================================================================== */}
      {/* 2. Satış analizi                                                    */}
      {/* ================================================================== */}
      <section className="space-y-3">
        <SectionTitle
          title={t("sales.title")}
          hint={tRevenue(`period.${periodValue(period)}`)}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat
            label={t("sales.dealCount")}
            value={<AnimatedNumber value={revenue.saleCount} />}
          />
          <MiniStat
            label={t("sales.volume")}
            value={<AnimatedNumber value={revenue.volume} format="compact" />}
          />
          <MiniStat
            label={t("sales.average")}
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
            <CardTitle>{t("sales.trendTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {revenue.saleCount === 0 ? (
              <EmptyNote>
                {t("sales.empty", {
                  period: tRevenue(`periodPhrase.${periodValue(period)}`),
                })}
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
            title={t("team.title")}
            hint={t("team.hint")}
            badge={t("team.badge")}
          />

          <Card>
            <CardContent className="space-y-2 p-4">
              {leaderboard.length === 0 ? (
                <EmptyNote>{t("team.empty")}</EmptyNote>
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
                        {t("team.meta", {
                          sales: row.performance?.totalSales ?? 0,
                          listings: row.performance?.activeListings ?? 0,
                          customers: row.performance?.activeCustomers ?? 0,
                        })}
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
        {t("page.footnote")}
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
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  listings: Awaited<ReturnType<typeof getTopListings>>;
  metric: "views_count" | "favorites_count";
  /* Etiket DIŞARIDAN: bu yardımcı senkron ve sayfada iki kez çiziliyor. */
  emptyLabel: string;
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
          <EmptyNote>{emptyLabel}</EmptyNote>
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
