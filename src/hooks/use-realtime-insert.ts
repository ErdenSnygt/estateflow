"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * ============================================================================
 * REALTIME — YENİ SATIR ABONELİĞİ
 * ============================================================================
 * Postgres'e eklenen satırları dinler ve geri çağırır. Uygulamada YALNIZCA İKİ
 * TABLO için kullanılıyor: `work_notes` ve `notifications`.
 *
 * -----------------------------------------------------------------------------
 * NEREDE KULLANILMIYOR VE NEDEN
 * -----------------------------------------------------------------------------
 * İlanlar, müşteriler, teklifler, randevular, satışlar — hiçbirinde yok. Bu bir
 * eksiklik değil, ölçüt farkı:
 *
 *   Realtime'ın değeri, veriyi BAŞKASININ değiştirdiği ve senin bunu beklemeden
 *   öğrenmen gerektiği yerde. Bir danışman kendi ilanını düzenlediğinde ekranı
 *   zaten kendisi değiştiriyor; `router.refresh()` sonucu anında gösteriyor ve
 *   bir WebSocket bağlantısı hiçbir şey eklemiyor — üstüne her sayfada açık
 *   duran bir soket, yeniden bağlanma mantığı ve iki ayrı doğruluk kaynağı
 *   getiriyor.
 *
 *   İş notu ve bildirim ise TANIMI GEREĞİ dışarıdan geliyor. Bir danışman sana
 *   soru sorduğunda ya da yönetici teklifini kabul ettiğinde, kullanıcının
 *   sayfayı yenilemesini beklemek özelliğin kendisini işlevsiz bırakırdı.
 *
 * FAZ 18: `messages` yerini `work_notes` aldı. Ölçüt değişmedi, tablo değişti —
 * yayın tanımı `0012_work_notes.sql` içinde güncellendi.
 *
 * -----------------------------------------------------------------------------
 * FİLTRE SUNUCUDA, İSTEMCİDE DEĞİL
 * -----------------------------------------------------------------------------
 * `filter` parametresi Postgres tarafında uygulanıyor: abone olan istemciye
 * yalnızca eşleşen satırlar gönderiliyor. Hepsini alıp tarayıcıda elemek,
 * başkalarının bildirimlerini ağdan geçirmek olurdu — RLS Realtime kanalında
 * da geçerli ama filtreyi doğru yere koymak yine de bizim işimiz.
 */

type Options = {
  table: "work_notes" | "notifications";
  /** PostgREST biçiminde: `agent_id=eq.agt-1`. Boşsa abonelik kurulmaz. */
  filter?: string;
  /** Kanal adı — aynı sayfada iki abonelik varsa çakışmasın. */
  channel: string;
  enabled?: boolean;
};

export function useRealtimeInsert<T extends Record<string, unknown>>(
  { table, filter, channel, enabled = true }: Options,
  onInsert: (row: T) => void,
) {
  /* Geri çağrı ref'te tutuluyor: her render'da yeni bir fonksiyon gelirse
     bağımlılık dizisi değişir ve abonelik saniyede bir kapanıp açılırdı. */
  const handler = React.useRef(onInsert);
  React.useEffect(() => {
    handler.current = onInsert;
  }, [onInsert]);

  React.useEffect(() => {
    if (!enabled || !filter) return;

    const supabase = createClient();

    const subscription = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter },
        (payload) => handler.current(payload.new as T),
      )
      .subscribe();

    /* Temizlik ŞART: sayfa değiştiğinde kanal kapanmazsa gezinme başına bir
       soket birikir ve aynı olay birden çok kez işlenir. */
    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [table, filter, channel, enabled]);
}
