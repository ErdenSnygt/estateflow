"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Json } from "@/types/supabase";
import {
  NOTIFICATION_PREFERENCE_FIELDS,
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
      toast.error("Tercih kaydedilemedi", { description: result.error });
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-1">
      {NOTIFICATION_PREFERENCE_FIELDS.map((field) => (
        <div
          key={field.type}
          className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-hover"
        >
          <Checkbox
            id={`pref-${field.type}`}
            checked={preferences[field.type]}
            disabled={pending === field.type}
            onCheckedChange={(checked) =>
              toggle(field.type, checked === true)
            }
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <Label
              htmlFor={`pref-${field.type}`}
              className="cursor-pointer text-[13.5px] font-medium text-foreground"
            >
              {field.label}
            </Label>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              {field.description}
            </p>
          </div>
        </div>
      ))}

      <p className="px-2 pt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        Kapatılan tür için bildirim <strong>hiç oluşturulmaz</strong> — sonradan
        açtığınızda geçmişe dönük bildirim gelmez. Kendi yaptığınız işlemler
        zaten bildirim üretmez.
      </p>
    </div>
  );
}
