"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * ============================================================================
 * HATA SINIRI — TÜM UYGULAMA SAYFALARI
 * ============================================================================
 * Faz 15'e kadar hiçbir route'ta `error.tsx` YOKTU. Veri katmanı sorgu
 * hatasını bilerek istisnaya çeviriyor (`lib/data/query.ts`: hata "boş liste"
 * gibi görünmesin) ama o istisnayı yakalayan bir sınır olmadığı için
 * kullanıcı Next'in ham hata ekranını görüyordu — üretimde "An error occurred
 * in the Server Components render" gibi hiçbir şey anlatmayan bir metin.
 *
 * -----------------------------------------------------------------------------
 * NEDEN TEK DOSYA, ROUTE BAŞINA DEĞİL
 * -----------------------------------------------------------------------------
 * `(app)` grup segmentine konan bir `error.tsx`, altındaki BÜTÜN route'ları
 * kapsıyor. On üç sayfaya ayrı ayrı kopyalamak, on üç kez güncellenmesi
 * gereken aynı metin demekti. Sayfaya özel bir hata mesajı gereken bir yer
 * de yok: kullanıcı için hepsi aynı durum — "bu ekran yüklenemedi".
 *
 * `layout.tsx` bu sınırın DIŞINDA kalıyor (Next'in kuralı): sidebar ve navbar
 * çizilmeye devam ediyor, yalnızca sayfa gövdesi bu bileşenle değişiyor.
 * İstenen davranış da bu — kullanıcı gezinmeye devam edebilmeli.
 *
 * -----------------------------------------------------------------------------
 * HATA METNİ NEDEN GÖSTERİLİYOR
 * -----------------------------------------------------------------------------
 * Üretimde Next hata mesajlarını maskeliyor ve yerine bir `digest` koyuyor.
 * O digest sunucu günlüğündeki kayıtla eşleşiyor, yani kullanıcı destek
 * isterken tek anlamlı bilgi o. Geliştirmede ise gerçek mesaj görünüyor ve
 * doğrudan işe yarıyor. İkisini de gösteriyoruz.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  React.useEffect(() => {
    /* Sunucu günlüğüne zaten düştü; bu, tarayıcı konsolunda da izlenebilsin
       diye. Üretimde bir hata izleme servisine gönderilecek nokta burası. */
    console.error("[app] sayfa çizilemedi:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100svh-12rem)] items-center justify-center px-4 py-12">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger-soft">
          <TriangleAlert className="size-6 text-danger" strokeWidth={1.7} />
        </span>

        <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-foreground">
          {t("errors.screenTitle")}
        </h2>

        <p className="mt-2 text-[13.5px] leading-relaxed text-secondary-foreground">
          {t("errors.screenBody")}
        </p>

        {(error.digest || error.message) && (
          <p className="mt-4 max-w-full break-words rounded-lg border border-hairline bg-surface-inset px-3 py-2 font-mono text-[11.5px] text-muted-foreground">
            {error.digest
              ? t("errors.code", { digest: error.digest })
              : error.message}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {/* `reset()` sayfayı yeniden çizmeyi deniyor — tam sayfa yenileme
              değil, yalnızca hata veren sınırı. Geçici bir ağ sorunuysa
              oturum ve gezinme durumu korunarak düzeliyor. */}
          <Button onClick={reset}>
            <RotateCcw className="size-4" />
            {t("common.retry")}
          </Button>
          <Button variant="secondary" asChild>
            <a href="/dashboard">{t("common.backToDashboard")}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
