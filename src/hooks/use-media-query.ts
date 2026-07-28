"use client";

import * as React from "react";

/**
 * CSS medya sorgusunu JavaScript'ten okur.
 *
 * NEDEN GEREKLİ: düzenin çoğu Tailwind breakpoint'leriyle, yani saf CSS ile
 * hallediliyor ve öyle kalmalı. Ama sidebar'ın DARALTILMIŞ olup olmaması bir
 * React state'i (kullanıcı tercihi, localStorage'da) ve tablet aralığında bu
 * tercihi ezmemiz gerekiyor. Bir sayı CSS'ten okunamadığı için sorgu buraya
 * taşındı.
 *
 * SUNUCUDA HER ZAMAN `false` DÖNER. Sunucu bir ekran genişliği bilmiyor;
 * uydurmak yerine "eşleşmedi" varsayılıyor ve ilk boyamadan hemen sonra
 * gerçek değere geçiliyor. `useSyncExternalStore` bu geçişi React'in kendi
 * hydration akışıyla uyumlu yapıyor — `useEffect` ile yazılan sürümlerde
 * görülen "bir kare yanlış düzen" sorunu doğmuyor.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
