import {
  Building2,
  CalendarClock,
  MessageSquare,
  Receipt,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";

import type { NotificationType } from "@/types/database";
import { cn } from "@/lib/utils";

/**
 * Bildirim türünün ikonu ve rengi.
 *
 * İkonlar SİDEBAR'DAKİLERLE AYNI: yeni ilan bildiriminde `Building2`, çünkü
 * menüde "İlanlar" da o ikonla duruyor. Bildirime bakan kullanıcı hangi
 * modülden geldiğini okumadan anlıyor.
 */
const ICONS: Record<NotificationType, LucideIcon> = {
  customer_added: UserRoundPlus,
  listing_created: Building2,
  sale_closed: Receipt,
  message_received: MessageSquare,
  appointment_scheduled: CalendarClock,
};

/** Renkler durum token'larından; `chart-*` paleti grafiklere ayrılmış durumda. */
const TONES: Record<NotificationType, string> = {
  customer_added: "bg-brand-soft text-brand",
  listing_created: "bg-brand-soft text-brand",
  /* Satış tek "iyi haber" — yeşil onun. */
  sale_closed: "bg-success-soft text-success",
  message_received: "bg-warning-soft text-warning",
  appointment_scheduled: "bg-surface-inset text-secondary-foreground",
};

export function NotificationIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  const Icon = ICONS[type];

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        TONES[type],
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
