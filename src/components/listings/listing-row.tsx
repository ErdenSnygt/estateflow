import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Eye, Heart, MapPin, Maximize2 } from "lucide-react";

import type { Listing } from "@/types/database";
import {
  formatListingPrice,
  formatRooms,
  isResidential,
} from "@/lib/listings";
import { formatArea, formatNumber } from "@/lib/format";
import { formatDate } from "@/i18n/dates";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";

/** Liste görünümündeki yatay ilan satırı — daha çok alan bilgisi sığar. */
export function ListingRow({ listing }: { listing: Listing }) {
  const t = useTranslations("listings");
  const format = useFormatter();

  return (
    <Link
      href={`/ilanlar/${listing.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card interactive className="overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-surface-inset sm:aspect-auto sm:h-[132px] sm:w-[188px]">
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, 188px"
              className="object-cover transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:pl-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <ListingStatusBadge status={listing.status} />
                  <Badge variant="outline">
                    {t(`category.${listing.category}`)}
                  </Badge>
                </div>
                <h3 className="truncate text-[14.5px] font-semibold text-foreground">
                  {listing.title}
                </h3>
                <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {listing.district}, {listing.city}
                  </span>
                </p>
              </div>

              <p className="shrink-0 text-[17px] font-semibold tracking-[-0.02em] text-foreground">
                {formatListingPrice(listing, t("perMonth"))}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Maximize2 className="size-3.5" />
                {formatArea(listing.area_sqm)}
              </span>
              {isResidential(listing.category) && listing.room_count > 0 && (
                <span>{formatRooms(listing.room_count)}</span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" />
                {formatNumber(listing.views_count)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="size-3.5" />
                {formatNumber(listing.favorites_count)}
              </span>
              <span className="ml-auto">
                {formatDate(format, listing.published_at, "short")}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
