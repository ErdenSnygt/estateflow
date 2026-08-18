import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, SearchX } from "lucide-react";

import { getListings } from "@/lib/data/listings";
import {
  countActiveFilters,
  parseListingFilters,
  parseViewMode,
  type SearchParamsInput,
} from "@/lib/listings-filters";
import { formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { ListingRow } from "@/components/listings/listing-row";
import { WriteLink } from "@/components/demo/write-link";

/**
 * Sonuç listesi ayrı bir async bileşen: sayfanın geri kalanı (başlık, filtre
 * çubuğu) anında çizilir, yalnızca bu bölüm Suspense ile iskelete düşer.
 */
export async function ListingResults({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}) {
  const filters = parseListingFilters(searchParams);
  const viewMode = parseViewMode(searchParams);
  const [listings, t] = await Promise.all([
    getListings(filters),
    getTranslations("listings"),
  ]);

  if (listings.length === 0) {
    const hasFilters = countActiveFilters(searchParams) > 0;

    return (
      <EmptyState
        icon={SearchX}
        badge={t(hasFilters ? "empty.filteredBadge" : "empty.badge")}
        title={t(hasFilters ? "empty.filteredTitle" : "empty.emptyTitle")}
        description={t(
          hasFilters ? "empty.filteredDescription" : "empty.emptyDescription",
        )}
        action={
          hasFilters ? (
            <Button variant="secondary" asChild>
              <Link href="/ilanlar">{t("empty.clearFilters")}</Link>
            </Button>
          ) : (
            <Button asChild>
              <WriteLink href="/ilanlar/yeni">
                <Plus className="size-4" />
                {t("newLong")}
              </WriteLink>
            </Button>
          )
        }
        className="min-h-[380px]"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Sayı ve "ilan listeleniyor" TEK METİNDE: İngilizcede sözcük sırası
          aynı olsa da her dilde öyle olmayabilir; parça birleştirmek çeviriye
          kapalı bir cümle üretirdi. Kalın yazım `<b>` ile metnin içinde. */}
      <p className="text-[12.5px] text-muted-foreground">
        {t.rich("count", {
          count: formatNumber(listings.length),
          b: (chunks) => (
            <span className="font-medium text-secondary-foreground">
              {chunks}
            </span>
          ),
        })}
      </p>

      {viewMode === "list" ? (
        <div className="space-y-3">
          {listings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
