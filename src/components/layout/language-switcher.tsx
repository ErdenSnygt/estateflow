"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe, Loader2 } from "lucide-react";

import { LOCALE_LABELS, locales, type Locale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * ============================================================================
 * DİL SEÇİCİ
 * ============================================================================
 * Faz 1'den Faz 19'a kadar navbar'da duran açılır GÖRSELDİ: iki dil listeleniyor,
 * Türkçe'nin yanında tik duruyor ve tıklamak hiçbir şey yapmıyordu. Artık
 * gerçek.
 *
 * -----------------------------------------------------------------------------
 * NEDEN `useTransition`
 * -----------------------------------------------------------------------------
 * Dil değişimi iki adım: çereze yaz (server action) + sayfayı sunucudan yeniden
 * çek (`router.refresh()`). İkincisi anlık değil — bütün ağaç sunucuda yeniden
 * çiziliyor. Geçiş göstergesi olmadan kullanıcı tıklıyor ve birkaç yüz
 * milisaniye hiçbir şey olmuyor; ikinci kez tıklıyor.
 *
 * `useTransition` bu bekleyişe isim veriyor: açılır kapanmıyor, seçilen dilin
 * yanında dönen bir gösterge çıkıyor.
 *
 * -----------------------------------------------------------------------------
 * NEDEN `router.refresh()`, `location.reload()` DEĞİL
 * -----------------------------------------------------------------------------
 * Tam sayfa yenileme de işe yarardı ama pahalı: uygulama kabuğu, oturum
 * bağlamı ve sidebar durumu baştan kuruluyor, ekran bir an beyazlıyor.
 * `router.refresh()` yalnızca sunucu bileşenlerini tazeliyor — istemci durumu
 * (açık çekmece, kaydırma konumu) korunuyor ve arayüz yerinde diline geçiyor.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const t = useTranslations("language");
  const active = useLocale() as Locale;
  const [isPending, startTransition] = React.useTransition();
  const [target, setTarget] = React.useState<Locale | null>(null);

  function choose(locale: Locale) {
    if (locale === active) return;
    setTarget(locale);

    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
      setTarget(null);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("trigger")}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg text-muted-foreground",
            "transition-colors duration-200 hover:bg-surface-hover hover:text-foreground",
            "data-[state=open]:bg-surface-hover data-[state=open]:text-foreground",
            className,
          )}
        >
          <Globe className="size-[18px]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            /* `onSelect` + `preventDefault` YOK: açılırın kapanması istenen
               davranış. Bekleme göstergesi tetikleyicide değil satırda
               duruyor ama menü kapandığı için kullanıcı onu yalnızca bir an
               görüyor — asıl geri bildirim, arayüzün diline geçmesi. */
            onSelect={() => choose(locale)}
            disabled={isPending}
          >
            <span>{LOCALE_LABELS[locale]}</span>
            {isPending && target === locale ? (
              <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
            ) : (
              locale === active && <Check className="ml-auto size-4 text-brand" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Mobil menü çekmecesindeki satır hâli.
 *
 * Açılır menü İÇİNDE açılır menü açmamak için ayrı bir bileşen: çekmece zaten
 * bir katman ve Radix'in iç içe portal davranışı dokunmatikte güvenilmez
 * (Faz 9'da filtre çekmecelerinde aynı karara varılmıştı). Burada iki dil
 * yan yana iki düğme olarak duruyor — iki seçenek için menü zaten fazla.
 */
export function LanguageToggleRow() {
  const router = useRouter();
  const t = useTranslations("language");
  const active = useLocale() as Locale;
  const [isPending, startTransition] = React.useTransition();

  function choose(locale: Locale) {
    if (locale === active) return;
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5">
      <Globe className="size-[18px] shrink-0 text-muted-foreground" />
      <span className="text-[13.5px] font-medium text-secondary-foreground">
        {t("label")}
      </span>

      <div className="ml-auto flex items-center gap-1">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => choose(locale)}
            disabled={isPending}
            aria-pressed={locale === active}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors",
              locale === active
                ? "bg-brand text-brand-foreground"
                : "bg-surface-active text-secondary-foreground active:opacity-80",
              isPending && "opacity-60",
            )}
          >
            {LOCALE_LABELS[locale]}
          </button>
        ))}
      </div>
    </div>
  );
}
