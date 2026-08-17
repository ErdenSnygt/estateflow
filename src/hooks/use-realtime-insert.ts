"use client";

import * as React from "react";

/* Tipler modülün KENDİSİNDEN türetiliyor (`typeof import(...)` tip konumunda
   çalışır ve derlemede tamamen siliniyor). Böylece `Database` genel tipi de
   korunuyor — `SupabaseClient`i çıplak import etmek onu kaybettirirdi. */
type BrowserClient = ReturnType<
  typeof import("@/lib/supabase/client").createClient
>;
type Channel = ReturnType<BrowserClient["channel"]>;

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
 *
 * -----------------------------------------------------------------------------
 * SUPABASE-JS GEÇ YÜKLENİYOR (Faz 26)
 * -----------------------------------------------------------------------------
 * Bu kanca uygulama kabuğunun içinde (`nav-badge-provider`, `notification-bell`)
 * yani GİRİŞ YAPMIŞ HER SAYFADA çalışıyor. Kütüphane statik import edildiğinde
 * ~51 kB gzip her sayfanın İLK YÜKÜNE biniyordu — üstelik ilk boyama için
 * gereksiz: abonelik zaten `useEffect` içinde, yani boyamadan sonra kuruluyor.
 *
 * Import artık efektin içinde ve dinamik. Davranış aynı: rozetler ilk çizimde
 * sunucudan gelen sayıyla doğru; canlı güncelleme parça indikten hemen sonra
 * (ölçülebilir bir gecikme yok, kullanıcı zaten bir olay beklemekte).
 *
 * Sadece TİP importu statik — `import type` derlemede siliniyor, çalışma
 * zamanında kütüphaneyi çağırmıyor.
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

    /* Kütüphane inerken bileşen sökülmüş olabilir; o durumda kanalı hiç
       açmıyoruz. Açıldıysa da temizlik için elimizde tutuyoruz. */
    let cancelled = false;
    let open: { client: BrowserClient; channel: Channel } | null = null;

    void (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      if (cancelled) return;

      const supabase = createClient();
      const subscription = supabase
        .channel(channel)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table, filter },
          (payload) => handler.current(payload.new as T),
        )
        .subscribe();

      open = { client: supabase, channel: subscription };
    })();

    /* Temizlik ŞART: sayfa değiştiğinde kanal kapanmazsa gezinme başına bir
       soket birikir ve aynı olay birden çok kez işlenir. */
    return () => {
      cancelled = true;
      if (open) void open.client.removeChannel(open.channel);
    };
  }, [table, filter, channel, enabled]);
}
