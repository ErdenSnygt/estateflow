import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Handshake } from "lucide-react";

import { getOffersList } from "@/lib/data/sales";
import { getAgentOptions } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canViewStaff } from "@/lib/agents";
import {
  countActiveOfferFilters,
  parseOfferFilters,
} from "@/lib/sales-filters";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/i18n/dates";
import type { SearchParamsInput } from "@/lib/search-params";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { SalesTabs } from "@/components/sales/sales-tabs";
import { OffersFilterBar } from "@/components/sales/sales-filter-bar";
import { OfferStatusBadge } from "@/components/offers/offer-status-badge";
import { OfferActions } from "@/components/offers/offer-actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offers.page");
  return { title: t("title") };
}

type PageProps = { searchParams: Promise<SearchParamsInput> };

export default async function TekliflerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseOfferFilters(params);

  /* Üçü de paralel — gerekçe `/satislar` sayfasında. */
  const [currentAgent, offers, agents, t, format] = await Promise.all([
    getCurrentAgent(),
    getOffersList(filters),
    getAgentOptions(),
    getTranslations("offers.page"),
    getFormatter(),
  ]);

  const agentOptions = canViewStaff(currentAgent?.role) ? agents : [];

  const pending = offers.filter((offer) => offer.status === "pending").length;
  const hasFilters = countActiveOfferFilters(params) > 0;

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<SalesTabs />}
      />

      <OffersFilterBar agentOptions={agentOptions} />

      {offers.length === 0 ? (
        /* Filtre boşluğu ile gerçek boşluk ayrı — gerekçe `/satislar`da. */
        <EmptyState
          icon={Handshake}
          badge={t(hasFilters ? "noResultBadge" : "emptyBadge")}
          title={t(hasFilters ? "noResultTitle" : "emptyTitle")}
          description={t(hasFilters ? "noResultBody" : "emptyBody")}
        />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-baseline justify-between gap-3 p-4">
              <span className="text-[13px] text-muted-foreground">
                {t("count", { count: offers.length })}
              </span>
              <span className="text-[13px] text-warning">
                {t("pending", { count: pending })}
              </span>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {offers.map((offer) => (
              <Card key={offer.id}>
                <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <OfferStatusBadge status={offer.status} />
                      {offer.listing ? (
                        <Link
                          href={`/ilanlar/${offer.listing.id}`}
                          className="min-w-0 truncate text-[14.5px] font-semibold text-foreground transition-colors hover:text-brand"
                        >
                          {offer.listing.title}
                        </Link>
                      ) : (
                        <span className="text-[14.5px] font-semibold text-muted-foreground">
                          {t("deletedListing")}
                        </span>
                      )}
                    </div>

                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                      <span className="tabular-nums">
                        {formatDate(format, offer.created_at, "short")}
                      </span>
                      {offer.customer && (
                        <>
                          <span aria-hidden>·</span>
                          <Link
                            href={`/musteriler/${offer.customer.id}`}
                            className="transition-colors hover:text-foreground"
                          >
                            {offer.customer.full_name}
                          </Link>
                        </>
                      )}
                      {offer.agent && (
                        <>
                          <span aria-hidden>·</span>
                          <Link
                            href={`/personeller/${offer.agent.id}`}
                            className="transition-colors hover:text-foreground"
                          >
                            {offer.agent.full_name}
                          </Link>
                        </>
                      )}
                      {offer.listing && (
                        <>
                          <span aria-hidden>·</span>
                          {/* Liste fiyatıyla kıyas: teklifin ne kadar altında
                              olduğu tek bakışta görünsün. */}
                          <span>
                            {t("listPrice", {
                              amount: formatCurrency(offer.listing.price),
                            })}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                    <p className="text-[17px] font-semibold tabular-nums text-foreground">
                      {formatCurrency(offer.amount)}
                    </p>
                    <OfferActions
                      offerId={offer.id}
                      status={offer.status}
                      amount={offer.amount}
                      listingTitle={
                        offer.listing?.title ?? t("fallbackListing")
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
