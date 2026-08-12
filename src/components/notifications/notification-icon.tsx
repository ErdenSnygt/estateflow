import {
  ArrowLeftRight,
  Building2,
  CalendarClock,
  CircleHelp,
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
  appointment_scheduled: CalendarClock,
  /* Faz 18 — üç iş notu olayı. İkonlar `WorkNoteIcon` ile AYNI: panoda soruyu
     `CircleHelp`, devri `ArrowLeftRight` olarak gören kullanıcı bildirimde de
     aynı şekli görüyor. */
  work_note_mention: CircleHelp,
  work_note_assigned: ArrowLeftRight,
  work_note_resolved: CircleHelp,
};

/** Renkler durum token'larından; `chart-*` paleti grafiklere ayrılmış durumda. */
const TONES: Record<NotificationType, string> = {
  customer_added: "bg-brand-soft text-brand",
  listing_created: "bg-brand-soft text-brand",
  /* Satış tek "iyi haber" — yeşil onun. */
  sale_closed: "bg-success-soft text-success",
  appointment_scheduled: "bg-surface-inset text-secondary-foreground",
  work_note_mention: "bg-brand-soft text-brand",
  work_note_assigned: "bg-warning-soft text-warning",
  /* Çözülen soru da bir "iyi haber": bir iş kapandı. */
  work_note_resolved: "bg-success-soft text-success",
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
