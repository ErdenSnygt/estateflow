"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import type { ListingSummary } from "@/lib/data/customers";
import { formatRooms, isResidential } from "@/lib/listings";
import { formatArea, formatCurrencyCompact } from "@/lib/format";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";

/**
 * Müşteri detayındaki küçük ilan kartı. Tam `ListingCard` yerine özet
 * kullanılıyor — bu bağlamda görüntülenme/favori sayısı gürültü.
 */
export function InterestCard({ listing }: { listing: ListingSummary }) {
  /* Yalnızca kategori etiketi çeviriden; kartın geri kalanı veri. */
  const t = useTranslations("listings");

  return (
    <Link
      href={`/ilanlar/${listing.id}`}
      className="group flex gap-3 rounded-lg border border-hairline bg-surface-inset p-2.5 outline-none transition-colors hover:border-hairline-strong hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface">
        {listing.image && (
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            sizes="64px"
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-105"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-1 text-[13.5px] font-medium text-foreground">
            {listing.title}
          </h4>
          <ListingStatusBadge status={listing.status} />
        </div>

        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">
            {listing.district}, {listing.city}
          </span>
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-secondary-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrencyCompact(listing.price, listing.currency)}
          </span>
          <span aria-hidden className="text-hairline-strong">
            ·
          </span>
          <span>{formatArea(listing.area_sqm)}</span>
          {isResidential(listing.category) && listing.room_count > 0 && (
            <>
              <span aria-hidden className="text-hairline-strong">
                ·
              </span>
              <span>{formatRooms(listing.room_count)}</span>
            </>
          )}
          <span aria-hidden className="text-hairline-strong">
            ·
          </span>
          <span>{t(`category.${listing.category}`)}</span>
        </div>
      </div>
    </Link>
  );
}
