"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtre durumunu URL'de tutar. Bileşen içi state yerine arama parametresi
 * kullanmanın üç kazancı var: link paylaşılabilir, geri tuşu çalışır ve
 * sunucu bileşeni veriyi doğrudan URL'den okuyabilir.
 *
 * Diğer modüller (Müşteriler, Randevular…) bu hook'u aynen kullanacak —
 * modüle özgü bilgi taşımaz.
 *
 * `keys` içinde bir GRUP (dizi) verilebilir: birlikte tek bir filtreyi
 * temsil eden anahtarlar. Örneğin bütçe bandı URL'de `minBudget` ve
 * `maxBudget` olarak durur ama kullanıcı için tek filtredir; grup olmadan
 * "Temizle 2" yazardı.
 */
type FilterKey = string | readonly string[];

export function useFilterParams(keys: readonly FilterKey[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const flatKeys = React.useMemo(() => keys.flat(), [keys]);

  const get = React.useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams],
  );

  /** Birden fazla anahtarı tek gezinmede günceller (çift render olmasın). */
  const setMany = React.useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }

      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const set = React.useCallback(
    (key: string, value: string | undefined) => setMany({ [key]: value }),
    [setMany],
  );

  const clear = React.useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of flatKeys) next.delete(key);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [flatKeys, pathname, router, searchParams]);

  /** Rozet olarak gösterilecek etkin filtre sayısı; grup tek sayılır. */
  const activeCount = React.useMemo(
    () =>
      keys.filter((key) =>
        typeof key === "string"
          ? searchParams.get(key)
          : key.some((member) => searchParams.get(member)),
      ).length,
    [keys, searchParams],
  );

  return { get, set, setMany, clear, activeCount };
}
