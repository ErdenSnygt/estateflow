"use client";

import * as React from "react";
import Link from "next/link";

import { useReadOnlyGuard } from "@/components/demo/read-only-guard";

/**
 * Bir YAZMA sayfasına giden bağlantı — demo hesabında yutulur.
 *
 * NEDEN AYRI BİR BİLEŞEN GEREKTİ: server action'lara koyduğumuz muhafız
 * (`lib/actions/guard.ts`) yalnızca YAZMA DENEMESİNİ yakalıyor. "Yeni ilan" ya
 * da "Düzenle" bağlantısı hiçbir action çağırmıyor — sadece bir forma
 * gidiyor. Demo kullanıcı o formu doldurup kaydete bastığında engellenirdi;
 * yani dolduran emeği boşa giderdi.
 *
 * Bağlantı GİZLENMİYOR: demo hesabının işi uygulamayı göstermek ve gizlenen
 * bir düğme, var olmayan bir özellik gibi okunur. Tıklanıyor, ne olduğu
 * söyleniyor, sayfa değişmiyor.
 *
 * `...rest` yayılıyor çünkü çağrı yerlerinin çoğu `<Button asChild>` içinde:
 * `Button` kendi sınıflarını çocuğa geçiriyor.
 */
export function WriteLink({
  href,
  children,
  ...rest
}: React.ComponentProps<typeof Link>) {
  const { isReadOnly, intercept } = useReadOnlyGuard();

  return (
    <Link
      href={href}
      onClick={intercept}
      /* `disabled` bir bağlantıda geçerli değil; `aria-disabled` ekran
         okuyucuya durumu söylüyor. Görsel olarak solmuyor — düğme çalışıyor,
         yalnızca sonucu farklı. */
      aria-disabled={isReadOnly || undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}
