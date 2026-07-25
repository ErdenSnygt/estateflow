"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Transition } from "framer-motion";
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
  /** AppShell ile paylaşılan geçiş ayarı — genişlik animasyonu senkron kalsın. */
  transition: Transition;
};

export function Sidebar({ isCollapsed, onToggle, transition }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      transition={transition}
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col",
        "border-r border-hairline bg-canvas-subtle",
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
      </div>
    </motion.aside>
  );
}
