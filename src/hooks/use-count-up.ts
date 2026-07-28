"use client";

import { useEffect, useState } from "react";

/**
 * Sayıyı 0'dan hedefe sayarak yükseltir.
 *
 * İlk render GERÇEK değeri döner, 0'ı değil: sunucu çıktısında ve hydration
 * öncesi ilk boyamada kartlar "0" göstermesin. Animasyon efekt içinde
 * başlar — orada 0'a çekip yukarı sayarız. Hareket hassasiyeti açıksa
 * animasyon hiç kurulmaz, değer yerinde kalır.
 *
 * Sekme arka plandaysa `requestAnimationFrame` hiç çalışmaz; sekme öne
 * gelince ilk kare geldiğinde geçen süre zaten dolmuş olur ve değer doğrudan
 * hedefe oturur.
 */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      duration <= 0
    ) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start = 0;

    const tick = (now: number) => {
      /* Sayacı ilk kare gelene kadar sıfırlamıyoruz: kare hiç gelmezse
         (arka plan sekmesi) kart gerçek değeri göstermeye devam eder. */
      if (start === 0) {
        start = now;
        setValue(0);
        frame = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(1, (now - start) / duration);
      // easeOutQuart — tasarım sistemindeki --ease-out-quint ile aynı his
      const eased = 1 - (1 - progress) ** 4;
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setValue(target);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
