import type { Metadata } from "next";
import Link from "next/link";
import { Coins, Receipt, TrendingUp, Wallet } from "lucide-react";

import { getRevenueByAgent, getRevenueOverview } from "@/lib/data/revenue";
import { getCurrentAgent } from "@/lib/auth/server";
import { isManagerRole } from "@/lib/agents";
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
  formatShortDate,
} from "@/lib/format";
import { oneOf, type SearchParamsInput } from "@/lib/search-params";
import { AnimatedNumber } from "@/components/animated-number";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AgentNotice } from "@/components/layout/agent-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { PeriodTabs } from "@/components/revenue/period-tabs";
import { RevenueChart } from "@/components/revenue/revenue-chart";
import { CommissionStatusControl } from "@/components/revenue/commission-status-control";

export const metadata: Metadata = {
  title: "Gelirler",
};

type PageProps = { searchParams: Promise<SearchParamsInput> };

/**
 * ============================================================================
 * GELİRLER
 * ============================================================================
 * SATIŞLAR'DAN FARKLI BİR SORU. Satışlar "hangi işlemler kapandı" diyor;
 * burası "komisyonum tahsil edildi mi". Aynı `sales` tablosu, farklı
 * büyüklük: orada müşterinin ödediği bedel, burada ofisin kazandığı pay.
 *
 * Kavramsal ayrımın tamamı `lib/revenue.ts` başlığında ve README'de.
 *
 * KAPSAMI RLS BELİRLİYOR: danışman yalnızca kendi satışlarını görüyor, yani
 * bu sayfa onun için kendi komisyon dökümü oluyor. Rol kontrolü yalnızca
 * tahsilat işaretleme düğmesinde ve başlık metinlerinde.
 */
export default async function GelirlerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period =
    oneOf<PeriodValue>(
      params,
      "d",
      PERIOD_OPTIONS.map((option) => option.value),
    ) ?? DEFAULT_PERIOD;

  const days = periodDays(period);

  /* Üçü paralel; `getRevenueByAgent` ile `getRevenueOverview` aynı önbellekli
     sorgudan besleniyor, yani ağa yalnızca bir kez çıkılıyor. */
  const [agent, overview, byAgent] = await Promise.all([
    getCurrentAgent(),
    getRevenueOverview(days),
    getRevenueByAgent(days),
  ]);

  if (!agent) {
    return (
      <div className="space-y-6 pb-4">
        <PageHeader
          title="Gelirler"
          description="Komisyon ve tahsilat takibi."
        />
        <AgentNotice />
      </div>
    );
  }

  const isManager = isManagerRole(agent.role);
  const { totals } = overview;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Gelirler"
        description="Kapanan işlemlerden doğan komisyon ve tahsilat durumu. Satışlar sayfası işlemleri, burası parayı gösterir."
        actions={<PeriodTabs current={period} />}
      />

      {/* --- Özet kartlar --- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Wallet className="size-4" />}
          label="Toplam komisyon"
          value={<AnimatedNumber value={totals.total} format="currency" />}
          hint={`${overview.saleCount} işlem · ${formatCurrencyCompact(overview.volume)} hacim`}
          emphasis
        />
        <SummaryCard
          icon={<Coins className="size-4" />}
          label="Tahsil edilen"
          value={<AnimatedNumber value={totals.collected} format="currency" />}
          hint={`Tahsilat oranı %${Math.round(totals.collectionRate * 100)}`}
          tone="success"
        />
        <SummaryCard
          icon={<TrendingUp className="size-4" />}
          label="Bekleyen"
          value={<AnimatedNumber value={totals.pending} format="currency" />}
          hint="Henüz tahsil edilmedi"
          tone="warning"
        />
        <SummaryCard
          icon={<Receipt className="size-4" />}
          label="Geciken"
          value={<AnimatedNumber value={totals.overdue} format="currency" />}
          hint={totals.overdue > 0 ? "Takip gerekiyor" : "Geciken tahsilat yok"}
          tone={totals.overdue > 0 ? "danger" : undefined}
        />
      </div>

      {overview.rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          badge="Boş"
          title={`${periodLabel(period)} içinde komisyon yok`}
          description="Komisyon, bir teklif kabul edilip satış kapandığında doğar. Daha geniş bir dönem seçmeyi ya da Teklifler sayfasından bekleyen teklifleri yanıtlamayı deneyin."
        />
      ) : (
        <>
          {/* --- Trend --- */}
          <Card>
            <CardHeader>
              <CardTitle>Aylık komisyon</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <RevenueChart data={overview.series} />
            </CardContent>
          </Card>

          {/* --- Danışman dökümü --- */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isManager ? "Danışman bazlı döküm" : "Komisyon dökümünüz"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              {byAgent.map((row) => (
                <div
                  key={row.agentId}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline px-3 py-2.5"
                >
                  <AgentAvatar
                    name={row.fullName}
                    initials={row.initials}
                    src={row.avatarUrl}
                    size={36}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-foreground">
                      {row.fullName}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {row.saleCount} işlem · %
                      {(row.commissionRate * 100).toFixed(1)} oran ·{" "}
                      {formatCurrencyCompact(row.volume)} hacim
                    </p>
                  </div>

                  {/* Tahsilat çubuğu: oranı sayı okumadan gösteriyor. */}
                  <div className="w-full sm:w-40">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
                      <div
                        className="h-full rounded-full bg-success"
                        style={{
                          width: `${Math.round(row.totals.collectionRate * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                      %{Math.round(row.totals.collectionRate * 100)} tahsil
                    </p>
                  </div>

                  <p className="shrink-0 text-[15px] font-semibold tabular-nums text-brand sm:w-32 sm:text-right">
                    {formatCurrency(row.totals.total)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* --- Komisyon satırları --- */}
          <Card>
            <CardHeader>
              <CardTitle>Komisyon kayıtları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              {overview.rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    {row.listing ? (
                      <Link
                        href={`/ilanlar/${row.listing.id}`}
                        className="block truncate text-[13.5px] font-medium text-foreground transition-colors hover:text-brand"
                      >
                        {row.listing.title}
                      </Link>
                    ) : (
                      <p className="truncate text-[13.5px] font-medium text-muted-foreground">
                        İlan silinmiş
                      </p>
                    )}
                    <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
                      <span className="tabular-nums">
                        {formatShortDate(row.closed_at)}
                      </span>
                      {row.agent && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{row.agent.full_name}</span>
                        </>
                      )}
                      <span aria-hidden>·</span>
                      <span className="tabular-nums">
                        {formatCurrencyCompact(row.amount)} satış
                      </span>
                    </p>
                  </div>

                  <CommissionStatusControl
                    saleId={row.id}
                    status={row.commission_status}
                    canEdit={isManager}
                  />

                  <p className="shrink-0 text-[14px] font-semibold tabular-nums text-foreground sm:w-28 sm:text-right">
                    {formatCurrency(row.commission)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {!isManager && (
            <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
              Tahsilat durumunu yalnızca ofis yöneticileri değiştirebilir.
              Komisyon tutarı, satış bedelinin prim oranınızla çarpımıdır.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  emphasis = false,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  /** Manşet sayı — `AnimatedNumber` düğümü olarak geliyor. */
  value: React.ReactNode;
  hint: string;
  emphasis?: boolean;
  tone?: "success" | "warning" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : emphasis
            ? "text-brand"
            : "text-foreground";

  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {icon}
          {label}
        </p>
        <p
          className={`text-[20px] font-semibold tabular-nums tracking-[-0.02em] ${valueClass}`}
        >
          {value}
        </p>
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
