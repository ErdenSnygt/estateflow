import Link from "next/link";
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
  const listings = await getListings(filters);

  if (listings.length === 0) {
    const hasFilters = countActiveFilters(searchParams) > 0;

    return (
      <EmptyState
        icon={SearchX}
        badge={hasFilters ? "Sonuç yok" : "Boş portföy"}
        title={
          hasFilters ? "Aramanızla eşleşen ilan yok" : "Henüz ilan eklenmemiş"
        }
        description={
          hasFilters
            ? "Filtreleri gevşetmeyi veya arama teriminizi kısaltmayı deneyin. Şehir ve ilçe seçimlerini kaldırmak genelde en hızlı sonucu verir."
            : "Portföyünüze ilk ilanı ekleyerek başlayın. Eklediğiniz ilanlar burada listelenecek ve portallara yayınlanabilecek."
        }
        action={
          hasFilters ? (
            <Button variant="secondary" asChild>
              <Link href="/ilanlar">Filtreleri temizle</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/ilanlar/yeni">
                <Plus className="size-4" />
                Yeni ilan ekle
              </Link>
            </Button>
          )
        }
        className="min-h-[380px]"
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-muted-foreground">
        <span className="font-medium text-secondary-foreground">
          {formatNumber(listings.length)}
        </span>{" "}
        ilan listeleniyor
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
