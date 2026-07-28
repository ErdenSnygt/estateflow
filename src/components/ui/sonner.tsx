"use client";

import * as React from "react";
import { Toaster as SonnerToaster } from "sonner";

/**
 * Bildirim katmanı. Sonner kendi renklerini CSS değişkenlerinden okur;
 * onları tasarım sistemi token'larına bağlıyoruz ki toast'lar kartlarla
 * aynı yüzeyde görünsün.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={20}
      duration={4000}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--text)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--surface)",
          "--success-text": "var(--success)",
          "--success-border": "var(--border)",
          "--error-bg": "var(--surface)",
          "--error-text": "var(--danger)",
          "--error-border": "var(--border)",
          "--border-radius": "14px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "shadow-lg!",
          description: "text-secondary-foreground!",
        },
      }}
    />
  );
}
