"use client";

import * as React from "react";
import { motion, type Transition } from "framer-motion";

import {
  Sidebar,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
} from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageTransition } from "@/components/layout/page-transition";

const COLLAPSE_STORAGE_KEY = "emlak-crm:sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  /** Sadece kullanıcı daraltma butonuna bastığında animasyon oynasın;
   *  localStorage'dan geri yükleme anında oynamasın. */
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

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

  const transition: Transition = shouldAnimate
    ? { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
    : { duration: 0 };

  return (
    <div className="relative min-h-svh bg-canvas">
      {/* Sayfanın üstünde çok hafif bir aydınlanma — düz koyu zemini kırar */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(76,125,255,0.07),transparent_70%)]"
      />

      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        transition={transition}
      />

      <motion.div
        initial={false}
        animate={{
          paddingLeft: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        }}
        transition={transition}
        className="relative flex min-h-svh flex-col"
      >
        <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

        <main className="flex-1">
          <div className="mx-auto h-full w-full max-w-[1600px] px-6 py-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </motion.div>

      <CommandPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
