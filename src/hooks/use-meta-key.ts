"use client";

import * as React from "react";

/**
 * Kısayol rozetlerinde gösterilecek değiştirici tuş sembolü.
 * SSR sırasında platform bilinmediği için "Ctrl" ile başlar,
 * hydration sonrası macOS'ta "⌘" olur — böylece uyuşmazlık oluşmaz.
 */
export function useMetaKey() {
  const [symbol, setSymbol] = React.useState("Ctrl");

  React.useEffect(() => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    if (isMac) setSymbol("⌘");
  }, []);

  return symbol;
}
