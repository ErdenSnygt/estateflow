import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import type { SearchParamsInput } from "@/lib/listings-filters";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ListingsFilterBar } from "@/components/listings/listings-filter-bar";
import { ListingResults } from "@/components/listings/listing-results";
import { ListingGridSkeleton } from "@/components/listings/listing-card-skeleton";

export const metadata: Metadata = {
  title: "İlanlar",
};

export default async function IlanlarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const params = await searchParams;

  /* Suspense anahtarı filtrelerle birlikte değişsin ki her filtre
     değişiminde iskelet yeniden görünsün — yoksa yalnızca ilk yüklemede
     çıkar ve sonraki aramalar donmuş gibi hissettirir. */
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
        title="İlanlar"
        description="Portföyünüzdeki tüm gayrimenkulleri filtreleyin, düzenleyin ve yayın durumlarını takip edin."
        actions={
          <Button asChild>
            <Link href="/ilanlar/yeni">
              <Plus className="size-4" />
              Yeni ilan
            </Link>
          </Button>
        }
      />

      <ListingsFilterBar />

      <Suspense key={suspenseKey} fallback={<ListingGridSkeleton />}>
        <ListingResults searchParams={params} />
      </Suspense>
    </div>
  );
}
