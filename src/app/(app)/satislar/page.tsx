import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";

import { getSalesList } from "@/lib/data/sales";
import { getAgentOptions } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canViewStaff } from "@/lib/agents";
import { parseSaleFilters } from "@/lib/sales-filters";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { SearchParamsInput } from "@/lib/search-params";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { SalesTabs } from "@/components/sales/sales-tabs";
import { SalesFilterBar } from "@/components/sales/sales-filter-bar";

export const metadata: Metadata = {
  title: "Satışlar",
};

type PageProps = { searchParams: Promise<SearchParamsInput> };

export default async function SatislarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseSaleFilters(params);

  /* ÜÇÜ DE PARALEL. Önceki sürüm önce `getCurrentAgent()`i bekliyor, sonra
     kalan ikisini başlatıyordu — rolü öğrenmek satış listesini ~190 ms
     geciktiriyordu. Danışman listesi rolden bağımsız çekiliyor; bir danışman
     için RLS onu zaten tek satıra indiriyor, yani beklemeye değmez. */
  const [currentAgent, sales, agents] = await Promise.all([
    getCurrentAgent(),
    getSalesList(filters),
    getAgentOptions(),
  ]);

  /* Danışman filtresi yalnızca yöneticiye gösteriliyor; danışman zaten RLS
     gereği kendi satışlarından başkasını göremiyor. */
  const agentOptions = canViewStaff(currentAgent?.role) ? agents : [];

  const total = sales.reduce((sum, sale) => sum + sale.amount, 0);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title="Satışlar"
        description="Kapanan işlemler. Bir teklif kabul edildiğinde kayıt buraya otomatik düşer."
        actions={<SalesTabs />}
      />

      <SalesFilterBar agentOptions={agentOptions} />

      {sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          badge="Boş"
          title="Bu aralıkta kapanan satış yok"
          description="Satışlar teklif kabul edildiğinde oluşur. Teklifler sekmesinden bekleyen teklifleri görebilirsiniz."
        />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-baseline justify-between gap-3 p-4">
              <span className="text-[13px] text-muted-foreground">
                {sales.length} kapanan işlem
              </span>
              <span className="text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
                {formatCurrency(total)}
              </span>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {sales.map((sale) => (
              <Card key={sale.id}>
                <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0 space-y-1">
                    {sale.listing ? (
                      <Link
                        href={`/ilanlar/${sale.listing.id}`}
                        className="block truncate text-[14.5px] font-semibold text-foreground transition-colors hover:text-brand"
                      >
                        {sale.listing.title}
                      </Link>
                    ) : (
                      <p className="text-[14.5px] font-semibold text-muted-foreground">
                        İlan silinmiş
                      </p>
                    )}

                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                      <span className="tabular-nums">
                        {formatShortDate(sale.closed_at)}
                      </span>
                      {sale.listing && (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            {sale.listing.district}, {sale.listing.city}
                          </span>
                        </>
                      )}
                      {sale.customer && (
                        <>
                          <span aria-hidden>·</span>
                          <Link
                            href={`/musteriler/${sale.customer.id}`}
                            className="transition-colors hover:text-foreground"
                          >
                            {sale.customer.full_name}
                          </Link>
                        </>
                      )}
                      {sale.agent && (
                        <>
                          <span aria-hidden>·</span>
                          <Link
                            href={`/personeller/${sale.agent.id}`}
                            className="transition-colors hover:text-foreground"
                          >
                            {sale.agent.full_name}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>

                  <p className="text-[17px] font-semibold tabular-nums text-success sm:text-right">
                    {formatCurrency(sale.amount)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
