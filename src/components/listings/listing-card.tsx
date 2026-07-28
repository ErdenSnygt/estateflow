import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, MapPin, Maximize2 } from "lucide-react";

import type { Listing } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  formatListingPrice,
  formatRooms,
  isResidential,
} from "@/lib/listings";
import { formatArea, formatNumber, formatShortDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";

/** Izgara görünümündeki ilan kartı. */
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/ilanlar/${listing.id}`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card interactive className="h-full overflow-hidden">
        {/* --- Görsel --- */}
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-inset">
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
          />

          {/* Alt kısımda fiyatın okunması için koyu geçiş */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[#05070C]/85 via-[#05070C]/10 to-transparent"
          />

          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <ListingStatusBadge status={listing.status} />
            <span className="rounded-md bg-[#05070C]/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              {CATEGORY_LABELS[listing.category]}
            </span>
          </div>

          <p className="absolute bottom-3 left-3 text-[19px] font-semibold tracking-[-0.02em] text-white drop-shadow-sm">
            {formatListingPrice(listing)}
          </p>
        </div>

        {/* --- İçerik --- */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="space-y-1.5">
            <h3 className="line-clamp-1 text-[14.5px] font-semibold text-foreground">
              {listing.title}
            </h3>
            <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">
                {listing.district}, {listing.city}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12.5px] text-secondary-foreground">
            <Spec icon={<Maximize2 className="size-3.5" />}>
              {formatArea(listing.area_sqm)}
            </Spec>
            {isResidential(listing.category) && listing.room_count > 0 && (
              <>
                <span aria-hidden className="text-hairline-strong">
                  ·
                </span>
                <Spec>{formatRooms(listing.room_count)}</Spec>
              </>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3 text-[12px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" />
                {formatNumber(listing.views_count)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="size-3.5" />
                {formatNumber(listing.favorites_count)}
              </span>
            </div>
            <span>{formatShortDate(listing.published_at)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Spec({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("flex items-center gap-1.5")}>
      {icon}
      {children}
    </span>
  );
}
