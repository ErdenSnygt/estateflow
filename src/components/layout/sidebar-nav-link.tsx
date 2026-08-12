"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/navigation";
import { useNavBadge } from "@/components/layout/nav-badge-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SidebarNavLinkProps = {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
};

export function SidebarNavLink({
  item,
  isActive,
  isCollapsed,
}: SidebarNavLinkProps) {
  const Icon = item.icon;
  /* Sayı canlı: okunmamış mesaj / bildirim sayacı. Sıfırsa rozet hiç
     çizilmiyor — "Mesajlar 0" bilgi vermeyen görsel gürültü. */
  const badge = useNavBadge(item.badgeKey);
  /* Etiket `navigation.ts`ten DEĞİL sözlükten: config yalnızca yapıyı
     taşıyor (Faz 19). */
  const label = useTranslations("nav")(`${item.key}.label`);

  const link = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center rounded-lg text-[13.5px] font-medium",
        "transition-colors duration-200 ease-[var(--ease-out-quint)]",
        isCollapsed ? "w-10 justify-center" : "w-full gap-3 px-3",
        isActive
          ? "text-foreground"
          : "text-secondary-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {/* Aktif zemin — öğeler arasında kayarak geçer */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-item"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className={cn(
            "absolute inset-0 rounded-lg border border-hairline-strong",
            "bg-brand-soft shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
          )}
        />
      )}

      <Icon
        className={cn(
          "relative z-10 size-[18px] shrink-0 transition-all duration-200",
          isActive
            ? "text-brand"
            : "text-muted-foreground group-hover:text-secondary-foreground",
          // Hover'da ikon çok hafif büyüsün — mikro animasyon
          "group-hover:scale-[1.08] group-active:scale-95",
        )}
      />

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex min-w-0 flex-1 items-center gap-2"
          >
            <span className="truncate">{label}</span>
            {badge > 0 ? (
              <span
                className={cn(
                  "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
                  "text-[10.5px] font-semibold tabular-nums",
                  isActive
                    ? "bg-brand text-brand-foreground"
                    : "bg-surface-active text-secondary-foreground",
                )}
              >
                {badge}
              </span>
            ) : null}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Daraltılmışken rozet noktaya dönüşür */}
      {isCollapsed && badge > 0 ? (
        <span className="absolute right-1.5 top-1.5 z-10 size-[7px] rounded-full bg-brand ring-2 ring-canvas-subtle" />
      ) : null}
    </Link>
  );

  if (!isCollapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
