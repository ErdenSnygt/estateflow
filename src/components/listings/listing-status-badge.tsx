"use client";

import { useTranslations } from "next-intl";

import type { ListingStatus } from "@/types/database";
import { STATUS_TONES } from "@/lib/listings";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  /* Etiket sözlükten (Faz 20); ton `lib/listings.ts` içinde kalıyor çünkü o
     bir tasarım kararı, metin değil. */
  const t = useTranslations("listings.status");

  return (
    <Badge variant={STATUS_TONES[status]} className={cn(className)}>
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-current opacity-80"
      />
      {t(status)}
    </Badge>
  );
}
