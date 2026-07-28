import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import type { SearchParamsInput } from "@/lib/search-params";
import { getAgentOptions } from "@/lib/data/agents";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CustomersFilterBar } from "@/components/customers/customers-filter-bar";
import { CustomerResults } from "@/components/customers/customer-results";
import { CustomerGridSkeleton } from "@/components/customers/customer-card-skeleton";

export const metadata: Metadata = {
  title: "Müşteriler",
};

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const params = await searchParams;
  /* Filtre çubuğu istemci bileşeni; danışman listesini kendisi çekemez. */
  const agentOptions = await getAgentOptions();

  /* İlanlar'daki ile aynı: Suspense anahtarı filtrelerle değişsin ki her
     filtre değişiminde iskelet yeniden görünsün. */
  const suspenseKey = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined
        ? []
        : Array.isArray(value)
          ? value.map((item) => [key, item] as [string, string])
          : [[key, value] as [string, string]],
    ),
  ).toString();

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title="Müşteriler"
        description="Portföyünüzle ilgilenen alıcıları takip edin; her kayıt ilgilendiği ilanlar ve görüşme geçmişiyle birlikte tutulur."
        actions={
          <Button asChild>
            <Link href="/musteriler/yeni">
              <Plus className="size-4" />
              Yeni müşteri
            </Link>
          </Button>
        }
      />

      <CustomersFilterBar agentOptions={agentOptions} />

      <Suspense key={suspenseKey} fallback={<CustomerGridSkeleton />}>
        <CustomerResults searchParams={params} />
      </Suspense>
    </div>
  );
}
