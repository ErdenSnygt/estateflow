"use client";

import { useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { UploadError } from "@/lib/storage/upload";
import { formatBytes } from "@/i18n/numbers";

/**
 * ============================================================================
 * YÜKLEME HATASINI METNE ÇEVİRME
 * ============================================================================
 * `UploadError` Faz 25'ten beri metin değil ANAHTAR taşıyor
 * (`lib/storage/upload.ts` başlığı). Anahtarı metne çevirme adımı beş ayrı
 * yükleme yüzeyinde tekrar edecekti: ilan galerisi, portre, kapak, evrak
 * bulutu ve iş notu eki. Beşi de aynı üç satırı yazmak yerine burada bir kez.
 *
 * `fallback` ZORUNLU: yakalanan şey bir `UploadError` olmayabilir (ağ yığını
 * beklenmedik bir şey fırlatabilir) ve o durumda gösterilecek metin çağıran
 * yüzeye ait — evrak yüklerken "Beklenmeyen bir hata" ile ilan galerisinde
 * dosya adı geçen bir cümle farklı yerlerde daha okunaklı.
 */
export function useUploadErrorMessage() {
  const t = useTranslations("upload.errors");
  const format = useFormatter();

  /* `useCallback` GEREKLİ, süs değil: `ImageDropzone` bu fonksiyonu bir
     `useCallback` bağımlılığında tutuyor ve her render'da yeni bir nesne
     dönseydi o geri çağrı sürekli yeniden kurulurdu. `t` de next-intl
     tarafından aynı sebeple kararlı tutuluyor. */
  return useCallback(
    function message(error: unknown, fallback: string): string {
      if (!(error instanceof UploadError)) return fallback;

      /* Sunucudan gelen ham metin varsa o kazanıyor: sözlükte karşılığı
         olmayan bir Storage hatası için uydurma bir çeviri göstermek yanlış
         bilgi olurdu (`lib/actions/result.ts` içindeki `raw()` ile aynı
         gerekçe). */
      if (error.raw) return error.raw;

      /* BOYUTLAR BURADA BİÇİMLENİYOR. `upload.ts` ham bayt taşıyor çünkü o
         modül saf ve dosya boyutunun ondalık ayracı da dile bağlı
         (`i18n/numbers.ts` → `formatBytes`). Sözlükteki anahtarlar `{size}`
         ve `{limit}` görüyor, ham sayıyı değil. */
      const { bytes, limitBytes, ...rest } = error.params;
      const values = {
        ...rest,
        ...(bytes !== undefined && { size: formatBytes(format, bytes) }),
        ...(limitBytes !== undefined && {
          limit: formatBytes(format, limitBytes),
        }),
      };

      /* Anahtarların argümanları farklı (`tooLarge` üç tane alıyor,
         `forbidden` hiç) ve tip düzeyinde bunlar ayrık; birlik hâlinde
         çağırınca next-intl hepsini birden istiyor. Anahtar/argüman
         eşleşmesini `upload.ts` garanti ediyor, doğruluğunu
         `messages.test.ts` denetliyor. */
      return t(error.key, values as never);
    },
    [t, format],
  );
}
