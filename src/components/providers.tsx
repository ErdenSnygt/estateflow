"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Faz 1'de tek tema (dark) var; ThemeProvider yine de kuruluyor ki
 * light tema eklendiğinde tek satır değişiklikle devreye girsin.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={300} skipDelayDuration={0}>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
