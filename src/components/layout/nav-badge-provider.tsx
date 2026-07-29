"use client";

import * as React from "react";

import type { NavBadgeKey } from "@/config/navigation";
import { useRealtimeInsert } from "@/hooks/use-realtime-insert";
import { useSessionUser } from "@/components/layout/session-provider";

/**
 * ============================================================================
 * CANLI GEZİNME ROZETLERİ
 * ============================================================================
 * Sidebar'daki "Mesajlar 4" ve "Bildirimler 9" rozetleri Faz 1'den Faz 16'ya
 * kadar `navigation.ts` içinde SABİT SAYILARDI. Hiçbir veriye bağlı
 * olmadıkları için mesaj okunduğunda ya da bildirim temizlendiğinde
 * değişmiyorlardı — kullanıcı için bu bir hata gibi görünüyordu, haklı olarak.
 *
 * -----------------------------------------------------------------------------
 * NEDEN CONTEXT, PROP DEĞİL
 * -----------------------------------------------------------------------------
 * Rozet ÜÇ AYRI YERDE çiziliyor: sidebar bağlantısı, mobil alt çubuk ve mobil
 * menü çekmecesi. Üçü de birbirinden bağımsız ağaçlarda ve aralarında
 * `AppShell` → `Sidebar` → `SidebarNavLink` gibi üç kademe var. Sayıyı prop
 * olarak geçirmek, yalnızca aktarmak için var olan dört ara parametre
 * demekti. `SessionProvider` ile aynı desen ve aynı gerekçe.
 *
 * -----------------------------------------------------------------------------
 * İKİ YÖN: SUNUCU DÜŞÜRÜR, REALTIME ARTIRIR
 * -----------------------------------------------------------------------------
 * Sayı iki farklı olayla değişiyor ve ikisi farklı yoldan geliyor:
 *
 *   AZALMA → kullanıcının kendi eylemi (mesajı okudu, bildirimi temizledi).
 *            İlgili action `revalidatePath("/", "layout")` çağırıyor, sunucu
 *            yeni sayıyı veriyor, aşağıdaki efekt yerel durumu ona teslim
 *            ediyor.
 *
 *   ARTMA  → DIŞARIDAN gelen bir olay (müşteri yazdı, yönetici teklifi kabul
 *            etti). Sunucu tazelemesini beklemek, kullanıcının rozeti ancak
 *            bir sonraki gezinmede görmesi demekti.
 *
 * Realtime bu yüzden yalnızca ARTIRIYOR; azaltma hep sunucudan. İki yön de
 * yerel durumdan hesaplansaydı iki ayrı doğruluk kaynağı doğardı ve biri
 * diğerinden sapardı.
 *
 * Bu, uygulamada Realtime'ın kullanıldığı ÜÇÜNCÜ yer — mesaj akışı ve bildirim
 * zilinden sonra. Ölçüt değişmedi: veriyi başkası değiştiriyor ve kullanıcının
 * beklemeden öğrenmesi gerekiyor (gerekçe `hooks/use-realtime-insert.ts`).
 */

export type NavBadgeCounts = Record<NavBadgeKey, number>;

const EMPTY: NavBadgeCounts = { messages: 0, notifications: 0 };

const NavBadgeContext = React.createContext<NavBadgeCounts>(EMPTY);

export function NavBadgeProvider({
  counts,
  children,
}: {
  counts: NavBadgeCounts;
  children: React.ReactNode;
}) {
  const user = useSessionUser();
  const [live, setLive] = React.useState(counts);

  /* Sunucu tazelendiğinde TEK DOĞRULUK KAYNAĞI yine sunucu. Okundu
     işaretlendikten sonra yerel sayı eski hâlde kalmasın. */
  React.useEffect(() => {
    setLive(counts);
  }, [counts]);

  /* --- Müşteriden gelen yeni mesaj ---
     Filtre `sender_type=eq.customer`: danışmanın kendi gönderdiği mesaj
     okunmamış sayılmıyor (`data/messages.ts` ile aynı kural). Hangi
     konuşmaların görülebildiğini RLS belirliyor — Realtime kanalı da
     politikalara tabi, yani başkasının yazışması hiç ulaşmıyor. */
  useRealtimeInsert<{ id: string }>(
    {
      table: "messages",
      channel: "nav-badge-messages",
      filter: "sender_type=eq.customer",
      enabled: Boolean(user.agentId),
    },
    React.useCallback(() => {
      setLive((current) => ({ ...current, messages: current.messages + 1 }));
    }, []),
  );

  /* --- Yeni bildirim ---
     Zil de aynı olaya abone ama kendi listesini tutuyor; buradaki abonelik
     yalnızca sayacı artırıyor. İkisini birleştirmek, zilin açılır listesini
     bu sağlayıcıya taşımak demekti — o liste yalnızca navbar'ı ilgilendiriyor. */
  useRealtimeInsert<{ id: string }>(
    {
      table: "notifications",
      channel: "nav-badge-notifications",
      filter: user.agentId ? `agent_id=eq.${user.agentId}` : undefined,
    },
    React.useCallback(() => {
      setLive((current) => ({
        ...current,
        notifications: current.notifications + 1,
      }));
    }, []),
  );

  return (
    <NavBadgeContext.Provider value={live}>{children}</NavBadgeContext.Provider>
  );
}

/**
 * Bir menü öğesinin rozet sayısı.
 *
 * `undefined` anahtar için 0 dönüyor — rozeti olmayan öğeler de bu kancayı
 * koşulsuz çağırabilsin (React kancaları koşullu çağrılamaz).
 *
 * SIFIR ROZET GÖSTERİLMEZ: çağıran taraf `count > 0` kontrolü yapıyor.
 * "Mesajlar 0" yazan bir rozet, bilgi vermeyen görsel gürültüdür.
 */
export function useNavBadge(key: NavBadgeKey | undefined): number {
  const counts = React.useContext(NavBadgeContext);
  return key ? counts[key] : 0;
}
