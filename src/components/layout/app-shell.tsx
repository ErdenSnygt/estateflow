"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
} from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageTransition } from "@/components/layout/page-transition";
import { SessionProvider } from "@/components/layout/session-provider";
import {
  NavBadgeProvider,
  type NavBadgeCounts,
} from "@/components/layout/nav-badge-provider";
import { AgentNotice } from "@/components/layout/agent-notice";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Session } from "@/lib/auth/session";

/* Anahtar marka adını taşıyor; Faz 19 yeniden adlandırmasında güncellendi.
   Eski anahtarı okuyan bir geçiş kodu YAZILMADI: bedeli, kullanıcının bir
   kez daha sidebar'ı daraltması. */
const COLLAPSE_STORAGE_KEY = "estateflow:sidebar-collapsed";

/**
 * ============================================================================
 * UYGULAMA KABUĞU — ÜÇ KADEMELİ GEZİNME
 * ============================================================================
 *
 *   < 768px  (md altı)   alt gezinme çubuğu + çekmece, sidebar yok
 *   768–1023 (md–lg)     sidebar DARALTILMIŞ (yalnızca ikon), alt çubuk yok
 *   ≥ 1024px (lg üstü)   sidebar tam, kullanıcı tercihine göre daraltılabilir
 *
 * Faz 1-8 boyunca yalnızca üçüncü kademe vardı; sidebar `lg` altında tamamen
 * gizleniyor ve gezinme komut paletine devrediliyordu. Masaüstünde savunulabilir
 * bir tercihti ama bu uygulama sahada, telefonda kullanılıyor.
 *
 * Tablet kademesinde sidebar daraltılıyor ama KAYBOLMUYOR: 768 px'de 268 px'lik
 * bir sidebar içeriğe 500 px bırakır (ilan kartları iki sütuna sığmaz), 76 px'lik
 * ikon şeridi ise hem gezinmeyi görünür tutar hem 690 px içerik bırakır.
 */
export function AppShell({
  session,
  notificationBell,
  navBadges,
  children,
}: {
  session: Session | null;
  /**
   * Navbar'daki bildirim zili — SUNUCUDA çizilip buraya slot olarak geliyor.
   *
   * Bu bileşen ve `Navbar` istemci tarafında; bildirim verisi sunucuda. Veriyi
   * prop olarak iki kademe aşağı taşımak yerine hazır düğüm geçiriliyor, yani
   * kabuk içinde ne olduğunu bilmiyor. Gerekçe
   * `components/notifications/notification-bell-server.tsx` başlığında.
   */
  notificationBell?: React.ReactNode;
  /**
   * Sidebar / alt çubuk / çekmece rozetlerinin CANLI sayıları.
   *
   * Sunucuda sayılıp context'e veriliyor; üç çizim noktası da oradan okuyor
   * (`nav-badge-provider.tsx`). Prop olarak geçirilseydi dört kademe boyunca
   * yalnızca aktarmak için var olan parametreler doğardı.
   */
  navBadges: NavBadgeCounts;
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  /** Sadece kullanıcı daraltma butonuna bastığında animasyon oynasın;
   *  localStorage'dan geri yükleme anında oynamasın. */
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  /* Tablet aralığında daraltma bir TERCİH değil, zorunluluk — kullanıcının
     kaydedilmiş seçimi bu aralıkta yok sayılıyor ve genişletme düğmesi de
     gizleniyor (`Sidebar` içinde). */
  const isTablet = useMediaQuery(
    "(min-width: 768px) and (max-width: 1023.98px)",
  );
  const collapsed = isTablet || isCollapsed;

  React.useEffect(() => {
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setShouldAnimate(true);
    setIsCollapsed((previous) => !previous);
  }, []);

  // Kalıcılık ayrı bir efektte: state güncelleyicisi saf kalsın.
  React.useEffect(() => {
    if (!shouldAnimate) return;
    localStorage.setItem(COLLAPSE_STORAGE_KEY, isCollapsed ? "1" : "0");
  }, [isCollapsed, shouldAnimate]);

  return (
    <SessionProvider session={session}>
      <NavBadgeProvider counts={navBadges}>
        <div className="relative min-h-svh bg-canvas">
          {/* Sayfanın üstünde çok hafif bir aydınlanma — düz koyu zemini kırar */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(76,125,255,0.07),transparent_70%)]"
          />

          <Sidebar
            isCollapsed={collapsed}
            onToggle={toggleSidebar}
            animateWidth={shouldAnimate}
            canToggle={!isTablet}
          />

          <div
            style={{
              paddingLeft: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
            }}
            /* Sidebar md altında gizli olduğu için ayrılan boşluk da kalkmalı;
               `!` inline stildeki paddingLeft'i ezer. Geçiş sidebar'ınkiyle
               aynı süre ve eğride — ikisi birlikte kaymalı. */
            className={cn(
              "relative flex min-h-svh flex-col max-md:pl-0!",
              "transition-[padding] ease-[var(--ease-out-quint)]",
              shouldAnimate ? "duration-300" : "duration-0",
            )}
          >
            <Navbar
              onOpenSearch={() => setIsSearchOpen(true)}
              notificationBell={notificationBell}
            />

            <main className="flex-1">
              {/* Alt boşluk yalnızca mobilde: sabit alt çubuk son kartı
                  örtmesin. 64 px çubuk + telefon home göstergesi. */}
              <div className="mx-auto h-full w-full max-w-[1600px] px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-6">
                <AgentNotice />
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>

          <MobileNav />

          <CommandPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </div>
      </NavBadgeProvider>
    </SessionProvider>
  );
}
