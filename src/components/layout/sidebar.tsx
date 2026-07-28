"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { site } from "@/config/site";
import { navigation } from "@/config/navigation";
import { LogoMark } from "@/components/brand/logo";
import { UserCard } from "@/components/layout/user-card";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { PlanCard } from "@/components/layout/plan-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const SIDEBAR_WIDTH = 268;
export const SIDEBAR_WIDTH_COLLAPSED = 76;

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
  /**
   * Genişlik değişimi animasyonlu mu — yalnızca kullanıcı daraltma düğmesine
   * bastığında. İlk boyamada ve breakpoint geçişlerinde anında olmalı.
   */
  animateWidth: boolean;
  /**
   * Tablet aralığında (md–lg) daraltma bir tercih değil zorunluluk; genişletme
   * düğmesi gösterilmez. Çalışmayan bir düğme göstermek, hiç göstermemekten
   * kötüdür.
   */
  canToggle?: boolean;
};

/**
 * GENİŞLİK NEDEN FRAMER İLE DEĞİL CSS İLE:
 *
 * Faz 9'da somut bir hata çıktı — tablet aralığında sidebar daraltılmış
 * davranıyor (etiketler gizli, düğme yok) ama genişliği 268 px'te takılı
 * kalıyordu; 768 px'lik ekranda içeriğe 500 px bırakıp yatay taşma üretiyordu.
 * Sebep, framer-motion'ın `transition={{ duration: 0 }}` ile verilen anında
 * geçişi uygulamaması: ilk boyamada 268 commit ediliyor, state değişince
 * başlatılan sıfır süreli animasyon hiç çalışmıyordu.
 *
 * Genişlik zaten bir DÜZEN meselesi, animasyon değil. Artık `style` ile
 * veriliyor ve yumuşak geçiş CSS `transition-[width]` ile yapılıyor —
 * kütüphane davranışına bağımlılık yok. Etiketlerin belirip kaybolması
 * (`AnimatePresence`) framer'da kaldı; orası gerçekten bir giriş/çıkış
 * animasyonu.
 */
export function Sidebar({
  isCollapsed,
  onToggle,
  animateWidth,
  canToggle = true,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      style={{ width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      className={cn(
        "transition-[width] ease-[var(--ease-out-quint)]",
        animateWidth ? "duration-300" : "duration-0",
        "fixed inset-y-0 left-0 z-40 flex flex-col",
        "border-r border-hairline bg-canvas-subtle",
        /* `md` altında sidebar kalkar ve yerini alt gezinme çubuğuna bırakır
           (`components/layout/mobile-nav.tsx`). 768 px ile 1024 px arasında
           ise daraltılmış olarak KALIR — gerekçe `app-shell.tsx` başlığında. */
        "max-md:hidden",
      )}
    >
      {/* --- Logo ---------------------------------------------------------- */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          isCollapsed ? "justify-center px-3" : "px-4",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogoMark />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col leading-none"
              >
                <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                  {site.name}
                </span>
                <span className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Pro
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* --- Kullanıcı kartı ------------------------------------------------ */}
      <div className={cn("shrink-0 pb-3", isCollapsed ? "px-3" : "px-3")}>
        <UserCard isCollapsed={isCollapsed} />
      </div>

      {/* --- Menü ----------------------------------------------------------- */}
      <nav
        aria-label="Ana gezinme"
        className={cn(
          "flex-1 space-y-5 overflow-y-auto overflow-x-hidden pb-4",
          isCollapsed ? "px-3" : "px-3",
        )}
      >
        {navigation.map((group) => (
          <div key={group.paletteTitle} className="space-y-1">
            {group.title && (
              <div className="flex h-6 items-center px-3">
                <AnimatePresence initial={false} mode="wait">
                  {isCollapsed ? (
                    <motion.span
                      key="rule"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="mx-auto h-px w-5 rounded-full bg-hairline-strong"
                    />
                  ) : (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {group.title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div
              className={cn(
                "space-y-0.5",
                isCollapsed && "flex flex-col items-center",
              )}
            >
              {group.items.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  isCollapsed={isCollapsed}
                  isActive={
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* --- Alt bölüm ------------------------------------------------------ */}
      <div className="shrink-0 space-y-2 border-t border-hairline p-3">
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <PlanCard />
            </motion.div>
          )}
        </AnimatePresence>

        {canToggle && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              aria-label={isCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
              className={cn(
                "flex h-9 items-center rounded-lg text-[13px] font-medium",
                "text-muted-foreground transition-colors duration-200",
                "hover:bg-surface-hover hover:text-foreground",
                isCollapsed ? "w-10 justify-center" : "w-full gap-3 px-3",
              )}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="size-[18px]" />
              ) : (
                <PanelLeftClose className="size-[18px]" />
              )}
              {!isCollapsed && <span>Menüyü daralt</span>}
            </button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">Menüyü genişlet</TooltipContent>
          )}
        </Tooltip>
        )}
      </div>
    </aside>
  );
}
