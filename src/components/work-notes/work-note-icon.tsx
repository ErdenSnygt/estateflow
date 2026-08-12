import { ArrowLeftRight, CircleHelp, StickyNote, type LucideIcon } from "lucide-react";

import type { WorkNoteType } from "@/types/database";
import { cn } from "@/lib/utils";

/**
 * Not türünün ikonu ve rengi.
 *
 * İKONLAR SÖZLÜKTE DEĞİL BURADA: `lib/work-notes.ts` saf bir modül ve
 * `NOTIFICATION_TYPE_LABELS` ile aynı ayrımı koruyor — etiket/ton metin,
 * ikon bir React bileşeni. Sözlüğe koymak, saf bir dosyayı React'e bağımlı
 * hâle getirirdi (`components/notifications/notification-icon.tsx` ile aynı
 * gerekçe).
 *
 * Renkler `WORK_NOTE_TYPE_TONES` ile aynı mantıkta: soru marka rengi (eylem
 * bekliyor), atama uyarı rengi (sahiplik değişti), not sessiz.
 */
const ICONS: Record<WorkNoteType, LucideIcon> = {
  question: CircleHelp,
  assignment: ArrowLeftRight,
  note: StickyNote,
};

const TONES: Record<WorkNoteType, string> = {
  question: "bg-brand-soft text-brand",
  assignment: "bg-warning-soft text-warning",
  note: "bg-surface-inset text-secondary-foreground",
};

export function WorkNoteIcon({
  type,
  className,
}: {
  type: WorkNoteType;
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
