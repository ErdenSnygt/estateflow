"use client";

import * as React from "react";

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
 */
const FALLBACK: Session = {
  userId: "",
  email: "",
  name: "Kullanıcı",
  title: "Ekip üyesi",
  initials: "?",
  /* Yedek oturum hiçbir yetki taşımaz: rol okunamıyorsa en dar varsayım
     doğru olanıdır — arayüz yönetici düğmelerini göstermez. */
  agentId: null,
  agentRole: null,
  isActive: true,
};

export function useSessionUser(): Session {
  return React.useContext(SessionContext) ?? FALLBACK;
}
