"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LockKeyhole, LogOut } from "lucide-react";

import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

/**
 * Pasifleştirilmiş hesap ekranı.
 *
 * NEDEN AYRI BİR EKRAN: pasif personelin veritabanı erişimi tamamen kapalı
 * (`current_agent_id()` null döner, tüm politikalar kapanır). Uygulama kabuğu
 * çizilseydi kullanıcı sıfır ilan, sıfır müşteri, sıfır KPI görürdü — bozulmuş
 * bir uygulamadan ayırt edilemezdi. Boşluğa isim vermek gerekiyor.
 *
 * "Hesabınız bir personel kaydına bağlı değil" uyarısından farklı bir durum:
 * orada hiç bağ kurulmamıştır, burada bağ vardı ve kaldırıldı.
 */
export function DeactivatedNotice({ name }: { name: string }) {
  const router = useRouter();
  const t = useTranslations();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-hairline-strong bg-surface">
          <LockKeyhole className="size-6 text-warning" strokeWidth={1.7} />
        </div>

        <h1 className="mt-6 text-[20px] font-semibold tracking-[-0.02em] text-foreground">
          {t("notices.deactivatedTitle")}
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-secondary-foreground">
          {t("notices.deactivatedBody", { name })}
        </p>

        <p className="mt-2 text-[13px] text-muted-foreground">
          {t("notices.deactivatedHint")}
        </p>

        <Button variant="secondary" className="mt-7" onClick={handleSignOut}>
          <LogOut className="size-4" />
          {t("common.signOut")}
        </Button>
      </div>
    </div>
  );
}
