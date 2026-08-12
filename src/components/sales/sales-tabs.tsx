"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Satışlar ↔ Teklifler geçişi.
 *
 * İki ayrı route, tek sekme şeridi: iki liste farklı filtrelere ve farklı
 * kolonlara sahip, tek sayfada istemci tarafı sekmeyle taşımak her ikisinin
 * verisini birden çekmeyi gerektirirdi. Ayrı route'lar sayesinde her sayfa
 * yalnızca kendi sorgusunu yapıyor ve filtreler URL'de ayrı yaşıyor.
 *
 * Sidebar'a ikinci bir menü öğesi eklenmedi — teklifler satışların bir alt
 * görünümü, ayrı bir modül değil.
 */
/* Etiketler sözlükte (`sales.tabs.*`); burada yalnızca adres ve anahtar. */
const TABS = [
  { href: "/satislar", key: "sales" },
  { href: "/satislar/teklifler", key: "offers" },
] as const;

export function SalesTabs() {
  const pathname = usePathname();
  const t = useTranslations("sales.tabs");

  return (
    <div
      role="tablist"
      aria-label={t("aria")}
      className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-inset p-1"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-surface text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </div>
  );
}
