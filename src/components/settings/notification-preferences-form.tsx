"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Json } from "@/types/supabase";
import {
  NOTIFICATION_PREFERENCE_TYPES,
  parseNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";
import { updateNotificationPreferences } from "@/lib/actions/profile";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Bildirim tercihleri.
 *
 * KAYDET DÜĞMESİ YOK — her anahtar anında yazılıyor. Beş onay kutusu için
 * ayrı bir kaydetme adımı, kullanıcının "kaydettim mi" diye düşünmesine yol
 * açardı; bu tür ayarlar her yerde anında uygulanıyor.
 *
 * Bedeli: her tıklama bir ağ turu. Karşılığında iyimser güncelleme var —
 * kutu hemen işaretleniyor, sunucu reddederse geri alınıyor.
 */
export function NotificationPreferencesForm({
  value,
}: {
  /** `agents.notification_preferences` ham jsonb değeri. */
  value: Json | null;
}) {
  const router = useRouter();
  const t = useTranslations("settings.notifications");

  const [preferences, setPreferences] = React.useState<NotificationPreferences>(
    () => parseNotificationPreferences(value),
  );
  const [pending, setPending] = React.useState<string | null>(null);

  /* Sunucu tazelendiğinde tek doğruluk kaynağı yine sunucu. */
  React.useEffect(() => {
    setPreferences(parseNotificationPreferences(value));
  }, [value]);

  async function toggle(type: keyof NotificationPreferences, next: boolean) {
    const previous = preferences;
    const optimistic = { ...preferences, [type]: next };

    setPreferences(optimistic);
    setPending(type);

    const result = await updateNotificationPreferences(optimistic);
    setPending(null);

    if (!result.ok) {
      setPreferences(previous);
      toast.error(t("error"), { description: result.error });
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-1">
      {NOTIFICATION_PREFERENCE_TYPES.map((type) => (
        <div
          key={type}
          className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-hover"
        >
          <Checkbox
            id={`pref-${type}`}
            checked={preferences[type]}
            disabled={pending === type}
            onCheckedChange={(checked) => toggle(type, checked === true)}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <Label
              htmlFor={`pref-${type}`}
              className="cursor-pointer text-[13.5px] font-medium text-foreground"
            >
              {t(`type.${type}.label`)}
            </Label>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              {t(`type.${type}.description`)}
            </p>
          </div>
        </div>
      ))}

      <p className="px-2 pt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        {t.rich("hint", { b: (chunks) => <strong>{chunks}</strong> })}
      </p>
    </div>
  );
}
