"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { Session } from "@/lib/auth/session";

/**
 * Oturumun istemci tarafındaki taşıyıcısı.
 *
 * Faz 5'e kadar navbar ve kullanıcı kartı `config/site.ts`'teki sabit
 * `currentUser` kaydını gösteriyordu — kim giriş yaparsa yapsın aynı isim
 * görünüyordu. Artık gerçek oturumdan geliyor.
 *
 * Neden context: oturumu okuyan iki bileşen (navbar, sidebar'daki kullanıcı
 * kartı) ağacın farklı dallarında ve aradaki `Sidebar` bu veriyle hiç
 * ilgilenmiyor. Prop olarak geçirmek iki ara bileşene ilgisiz bir parametre
 * eklerdi.
 *
 * Değer sunucuda çözülüp buraya veriliyor; istemci hiçbir zaman kendi başına
 * oturum sorgusu yapmıyor.
 */
const SessionContext = React.createContext<Session | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Uygulama kabuğu yalnızca middleware'in geçirdiği isteklerde çizilir, yani
 * oturum pratikte hep dolu. Yine de null gelebilir (çerez tam o anda düşerse)
 * ve arayüz boş isim basmaktansa nötr bir yedek göstersin.
 *
 * FAZ 19: yedek ad ve unvan artık çeviriden geliyor, bu yüzden sabit bir nesne
 * değil bir kanca içinde kuruluyor — `useTranslations()` modül düzeyinde
 * çağrılamaz.
 */
export function useSessionUser(): Session {
  const t = useTranslations("common");
  const session = React.useContext(SessionContext);

  if (session) return session;

  return {
    userId: "",
    email: "",
    name: t("fallbackUserName"),
    title: t("fallbackUserTitle"),
    initials: "?",
    /* Yedek oturum hiçbir yetki taşımaz: rol okunamıyorsa en dar varsayım
       doğru olanıdır — arayüz yönetici düğmelerini göstermez. */
    agentId: null,
    agentRole: null,
    isActive: true,
    /* `false` ve bu bilinçli: `isReadOnly` bir YASAK değil, bir UYARI bayrağı.
       Bilinmeyen bir oturumu demo sanıp ekrana "Salt Okunur" bandı asmak
       yanlış bilgi olurdu. Gerçek engel zaten RLS ve action muhafızında. */
    isReadOnly: false,
  };
}
