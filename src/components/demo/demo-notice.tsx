"use client";

import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";

import { useSessionUser } from "@/components/layout/session-provider";

/**
 * Demo hesabının kalıcı bandı.
 *
 * `AgentNotice` ile aynı yerde ve aynı kalıpta duruyor (sayfa içeriğinin
 * üstünde, kabuğun içinde) — bir sayfada değil HER sayfada görünmesi gerekiyor,
 * çünkü anlattığı şey sayfaya değil OTURUMA ait.
 *
 * TON BİLEREK NÖTR, uyarı değil: `border-hairline` + `surface-inset`, sarı ya
 * da kırmızı değil. Demo hesabı bir hata durumu değil, bilinçli bir kısıt.
 * Uyarı rengi kullanmak ziyaretçiye "bir şeyler ters gitti" dedirtirdi.
 *
 * Kalıcı ve kapatılamaz: kapatılabilir olsaydı kullanıcı ilk sayfada kapatır,
 * yarım saat sonra bir düğmenin neden çalışmadığını anlamazdı.
 */
export function DemoNotice() {
  const { isReadOnly } = useSessionUser();
  const t = useTranslations("demo");

  if (!isReadOnly) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-hairline-strong bg-surface-inset px-4 py-3">
      <Eye className="mt-0.5 size-4 shrink-0 text-brand" />
      <div className="min-w-0 space-y-1">
        <p className="text-[13.5px] font-medium text-foreground">
          {t("bannerTitle")}
        </p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {t("bannerBody")}
        </p>
      </div>
    </div>
  );
}

/**
 * Navbar'daki küçük rozet.
 *
 * Bant sayfa içeriğiyle birlikte kayıp gidiyor; bu rozet üst çubukta SABİT
 * duruyor. İkisi birden gereksiz gibi görünüyor ama farklı anlarda okunuyorlar:
 * bant sayfaya ilk bakışta, rozet "acaba hangi hesaptayım" diye üste
 * bakıldığında.
 *
 * Mobilde gizli (`hidden md:inline-flex`): 375 px'de navbar zaten üç öğeye
 * iniyor. Orada bant görevi görüyor.
 */
export function DemoBadge() {
  const { isReadOnly } = useSessionUser();
  const t = useTranslations("demo");

  if (!isReadOnly) return null;

  return (
    <span
      className="hidden items-center gap-1.5 rounded-md border border-hairline-strong bg-surface-inset px-2 py-1 text-[11.5px] font-medium text-secondary-foreground md:inline-flex"
      title={t("bannerBody")}
    >
      <Eye className="size-3.5 text-brand" />
      {t("badge")}
      <span className="text-muted-foreground">· {t("badgeReadOnly")}</span>
    </span>
  );
}
