"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useSessionUser } from "@/components/layout/session-provider";

/**
 * ============================================================================
 * SALT OKUNUR HESAP — ARAYÜZ KATMANI
 * ============================================================================
 * Üç katmanın en dıştakisi ve TEK BAŞINA HİÇBİR ŞEY KORUMAZ:
 *
 *   1. RLS       → demo rolü için yazma politikası yok, veritabanı reddediyor
 *   2. Action    → `denyIfReadOnly()` her yazma action'ının ilk satırında
 *   3. Arayüz    → burası: kullanıcı NEDEN olmadığını öğreniyor
 *
 * -----------------------------------------------------------------------------
 * NEDEN GİZLEMEK YERİNE ENGELLEYİP ANLATMAK
 * -----------------------------------------------------------------------------
 * Düğmeleri gizlemek daha kolay olurdu ama demo hesabının işi tam olarak
 * uygulamayı GÖSTERMEK. "Yeni İlan" düğmesi gizlenirse ziyaretçi o özelliğin
 * var olduğunu hiç öğrenmez — tanıtım hesabı, tanıtacağı şeyi saklamış olur.
 *
 * Bu yüzden düğmeler yerinde duruyor, tıklanabiliyor ve tıklanınca ne olduğunu
 * söyleyen bir bildirim çıkıyor. Tek istisna GİRİŞİ OLMAYAN yerler: düzenleme
 * sayfasına girip formu doldurduktan sonra reddedilmek bilgilendirme değil,
 * zaman kaybı. Oralarda kapı sunucuda kapalı (`getManagerAgent()`).
 *
 * -----------------------------------------------------------------------------
 * KULLANIM
 * -----------------------------------------------------------------------------
 *     const guard = useReadOnlyGuard();
 *     <Button onClick={guard.wrap(handleSave)}>Kaydet</Button>
 *
 * ya da bir bağlantı için:
 *
 *     <Link href="/ilanlar/yeni" onClick={guard.intercept}>Yeni ilan</Link>
 *
 * `wrap` demo değilse özgün fonksiyonun KENDİSİNİ döndürüyor — normal
 * kullanıcıda araya hiçbir şey girmiyor, ek bir render maliyeti yok.
 */
export function useReadOnlyGuard() {
  const { isReadOnly } = useSessionUser();
  const t = useTranslations("demo");

  const notify = React.useCallback(() => {
    toast.info(t("blockedTitle"), { description: t("blockedBody") });
  }, [t]);

  /** Olayı yutar ve bildirim gösterir. Demo değilse hiçbir şey yapmaz. */
  const intercept = React.useCallback(
    (event: React.SyntheticEvent) => {
      if (!isReadOnly) return;
      event.preventDefault();
      event.stopPropagation();
      notify();
    },
    [isReadOnly, notify],
  );

  /**
   * Bir eylemi sarmalar.
   *
   * Jenerik: sarmalanan fonksiyonun imzası korunuyor, yani `onClick`,
   * `onSelect` ve form `onSubmit` aynı yardımcıyı kullanabiliyor.
   */
  const wrap = React.useCallback(
    <A extends unknown[], R>(action: (...args: A) => R) => {
      if (!isReadOnly) return action;
      return (...args: A): R | undefined => {
        const first = args[0];
        /* Form gönderimini durdurmak için olayın kendisi gerekiyor; olay
           almayan eylemlerde (ör. bir onay diyaloğunun `onConfirm`'ü) sadece
           bildirim yeterli. */
        if (
          first &&
          typeof first === "object" &&
          "preventDefault" in first &&
          typeof (first as React.SyntheticEvent).preventDefault === "function"
        ) {
          (first as React.SyntheticEvent).preventDefault();
        }
        notify();
        return undefined;
      };
    },
    [isReadOnly, notify],
  );

  return { isReadOnly, intercept, wrap, notify };
}
