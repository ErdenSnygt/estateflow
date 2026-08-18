import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  Building2,
  Coins,
  Mail,
  Pencil,
  Phone,
  TrendingUp,
  UserRound,
  UserRoundX,
  Users,
} from "lucide-react";

import { getAgentById, getAgentPerformance } from "@/lib/data/agents";
import { getListings } from "@/lib/data/listings";
import { getCustomers } from "@/lib/data/customers";
import { getViewerAgent } from "@/lib/auth/server";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { formatRate } from "@/i18n/numbers";
import { formatDate } from "@/i18n/dates";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { AgentRoleBadge } from "@/components/agents/agent-role-badge";
import { AgentStatusToggle } from "@/components/agents/agent-status-toggle";
import { AgentCover } from "@/components/agents/agent-cover";
import { AgentBadges } from "@/components/agents/agent-badges";
import { computeBadges } from "@/lib/badges";
import { Button } from "@/components/ui/button";
import { StaffGuard } from "@/components/agents/staff-guard";
import { ListingRow } from "@/components/listings/listing-row";
import { CustomerCard } from "@/components/customers/customer-card";
import { WriteLink } from "@/components/demo/write-link";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [agent, t] = await Promise.all([
    getAgentById(id),
    getTranslations("agents.detail"),
  ]);
  return { title: agent ? agent.full_name : t("notFound") };
}

/** Detay sayfasında gösterilecek en fazla kayıt — sayfanın tamamı bir özet. */
const PREVIEW_LIMIT = 6;

export default async function AgentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const manager = await getViewerAgent();
  if (!manager) return <StaffGuard />;

  const agent = await getAgentById(id);
  if (!agent) notFound();

  /* İlanlar ve müşteriler için YENİ FONKSİYON YAZILMADI: mevcut liste
     sorguları zaten danışman filtresi alıyor, sayfa yalnızca onu geçiriyor.
     `getListings`e `agent` alanı bu faz için eklendi; `getCustomers` onu
     Faz 4'ten beri taşıyordu. */
  const [performance, listings, customers, t, format] = await Promise.all([
    getAgentPerformance(agent.id),
    getListings({ agent: agent.id }),
    getCustomers({ agent: agent.id }),
    getTranslations("agents.detail"),
    getFormatter(),
  ]);

  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/personeller"
        backLabel={t("back")}
        title={agent.full_name}
        description={`${agent.id.toUpperCase()} · ${agent.title}`}
        actions={
          <>
            <Button variant="secondary" asChild>
              <WriteLink href={`/personeller/${agent.id}/duzenle`}>
                <Pencil className="size-4" />
                {tCommon("edit")}
              </WriteLink>
            </Button>
            {/* Kendi hesabını pasifleştirme düğmesi hiç gösterilmiyor;
                action da reddediyor. */}
            {agent.id !== manager.id && (
              <AgentStatusToggle
                agentId={agent.id}
                agentName={agent.full_name}
                isActive={agent.is_active}
              />
            )}
          </>
        }
      />

      {/* Kapak + kimlik şeridi — `/profil` ile AYNI bileşen. İki sayfa aynı
          kaydı gösteriyor; tek fark kimin baktığı ve hangi düğmelerin
          çıktığı (gerekçe `/profil/page.tsx` başlığında). */}
      <AgentCover agent={agent} />

      {!agent.is_active && (
        <div className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-inset px-4 py-3">
          <UserRoundX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-[13px] leading-relaxed text-secondary-foreground">
            {/* "pasif" cümlenin ortasında ve yeri dile göre değişiyor. */}
            {t.rich("inactiveNotice", {
              b: (chunks) => (
                <strong className="text-foreground">{chunks}</strong>
              ),
            })}
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------------------------------------------------------------- */}
        {/* Sol sütun                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="min-w-0 space-y-5">
          {/* --- Performans özeti --- */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryTile
              icon={<TrendingUp className="size-4" />}
              label={t("totalSales")}
              value={formatCurrencyCompact(performance.totalRevenue)}
              hint={t("totalSalesHint", { count: performance.totalSales })}
            />
            <SummaryTile
              icon={<Building2 className="size-4" />}
              label={t("activeListings")}
              value={String(performance.activeListings)}
              hint={t("activeListingsHint", {
                count: performance.totalListings,
              })}
            />
            <SummaryTile
              icon={<Users className="size-4" />}
              label={t("activeCustomers")}
              value={String(performance.activeCustomers)}
              hint={t("activeCustomersHint", {
                count: performance.totalCustomers,
              })}
            />
          </div>

          {/* --- İlanlar --- */}
          <section className="space-y-3">
            <SectionHeading
              title={t("listingsTitle")}
              count={listings.length}
            />

            {listings.length === 0 ? (
              <EmptyRow text={t("listingsEmpty")} />
            ) : (
              <div className="space-y-3">
                {listings.slice(0, PREVIEW_LIMIT).map((listing) => (
                  <ListingRow key={listing.id} listing={listing} />
                ))}
                {listings.length > PREVIEW_LIMIT && (
                  <MoreLink
                    href="/ilanlar"
                    text={t("moreListings", {
                      count: listings.length - PREVIEW_LIMIT,
                    })}
                  />
                )}
              </div>
            )}
          </section>

          {/* --- Müşteriler --- */}
          <section className="space-y-3">
            <SectionHeading
              title={t("customersTitle")}
              count={customers.length}
            />

            {customers.length === 0 ? (
              <EmptyRow text={t("customersEmpty")} />
            ) : (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {customers.slice(0, PREVIEW_LIMIT).map((customer) => (
                    <CustomerCard key={customer.id} customer={customer} />
                  ))}
                </div>
                {customers.length > PREVIEW_LIMIT && (
                  <MoreLink
                    href={`/musteriler?agent=${agent.id}`}
                    text={t("moreCustomers", {
                      count: customers.length - PREVIEW_LIMIT,
                    })}
                  />
                )}
              </div>
            )}
          </section>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sağ sütun                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AgentAvatar
                    name={agent.full_name}
                    initials={agent.initials}
                    src={agent.avatar_url}
                    size={52}
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-[15px] font-medium text-foreground">
                      {agent.full_name}
                    </p>
                    <AgentRoleBadge role={agent.role} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-hairline pt-4">
                <ContactRow
                  icon={<Phone className="size-3.5" />}
                  href={`tel:${agent.phone.replace(/\s/g, "")}`}
                >
                  {agent.phone || "—"}
                </ContactRow>
                <ContactRow
                  icon={<Mail className="size-3.5" />}
                  href={`mailto:${agent.email}`}
                >
                  {agent.email}
                </ContactRow>
              </div>

              <p className="flex items-center gap-1.5 border-t border-hairline pt-4 text-[12.5px] text-muted-foreground">
                <UserRound className="size-3.5" />
                {t("joinedAt", { date: formatDate(format, agent.created_at) })}
              </p>

              {/* Hesap bağı — bağlanmamış personel giriş yapamaz. */}
              <p className="text-[12.5px] text-muted-foreground">
                {t(agent.user_id ? "hasAccount" : "noAccount")}
              </p>
            </CardContent>
          </Card>

          {/* --- Bu ay --- */}
          <Card>
            <CardHeader>
              <CardTitle>{t("monthTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-2">
              <StatLine
                label={t("monthDeals", { count: performance.monthlySales })}
                value={formatCurrency(performance.monthlyRevenue)}
              />
              <div className="border-t border-hairline pt-3">
                <StatLine
                  icon={<Coins className="size-3.5" />}
                  label={t("commissionLabel", {
                    rate: formatRate(format, agent.commission_rate),
                  })}
                  value={formatCurrency(performance.monthlyCommission)}
                  emphasis
                />
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  {t("commissionHint")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rozetler — `/profil` ile aynı bileşen ve aynı hesap. Yönetici,
              danışmanın kendi profilinde gördüğünün aynısını görüyor. */}
          <AgentBadges badges={computeBadges(performance)} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SummaryTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {icon}
          {label}
        </p>
        <p className="text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
          {value}
        </p>
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      <span className="text-[12.5px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-5 text-[13px] text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}

function MoreLink({ href, text }: { href: string; text: string }) {
  return (
    <Link
      href={href}
      className="inline-flex text-[12.5px] font-medium text-brand transition-colors hover:text-brand-strong"
    >
      + {text}
    </Link>
  );
}

function ContactRow({
  icon,
  href,
  children,
}: {
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-secondary-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{children}</span>
    </a>
  );
}

function StatLine({
  icon,
  label,
  value,
  emphasis = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={
          emphasis
            ? "text-[14px] font-semibold tabular-nums text-brand"
            : "text-[14px] font-medium tabular-nums text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
