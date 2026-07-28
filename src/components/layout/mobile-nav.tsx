"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { mobilePrimaryItems, type NavItem } from "@/config/navigation";
import { MobileMenuDrawer } from "@/components/layout/mobile-menu-drawer";

/**
 * ============================================================================
 * ALT GEZİNME ÇUBUĞU
 * ============================================================================
 * `md` altında görünür. Faz 1'den beri sidebar `lg` altında tamamen gizliydi
 * ve gezinme komut paletine (Cmd+K) devredilmişti — masaüstünde makul, ama bu
 * uygulama SAHADA kullanılıyor: danışman evin önünde, telefonda, tek elle.
 * Klavye kısayolu orada bir gezinme yöntemi değil.
 *
 * Beş modül + çekmece. Seçim gerekçesi `config/navigation.ts` içinde.
 *
 * `layoutId`: aktif göstergesi öğeler arasında kayarak geçiyor — sidebar'daki
 * `sidebar-active-item` ile aynı desen, farklı bir kimlikle (ikisi aynı anda
 * ekranda olmadığı için çakışmıyorlar ama aynı kimliği paylaşsalardı Framer
 * ikisi arasında geçiş yapmaya çalışırdı).
 */
export function MobileNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  /* Çekmecedeki bir bağlantıya basınca çekmece kapanmalı; `pathname`
     değişimini izlemek en güvenilir sinyal (geri tuşu da kapatır). */
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const isActive = (item: NavItem) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  /* Çekmece açıkken "Daha Fazla" da aktif görünsün: kullanıcı bir yerdeyken
     menüyü açtığında iki öğe birden vurgulanmasın. */
  const activeHref = isMenuOpen
    ? "__menu__"
    : mobilePrimaryItems.find(isActive)?.href;

  return (
    <>
      <nav
        aria-label="Mobil gezinme"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 md:hidden",
          "border-t border-hairline bg-canvas-subtle/95 backdrop-blur-xl",
          /* Telefonun alt çubuğu (home indicator) içeriği yemesin. */
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <ul className="flex h-16 items-stretch">
          {mobilePrimaryItems.map((item) => (
            <li key={item.href} className="flex-1">
              <MobileNavLink
                href={item.href}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
                isActive={activeHref === item.href}
              />
            </li>
          ))}

          <li className="flex-1">
            <MobileNavLink
              label="Daha Fazla"
              icon={Menu}
              isActive={activeHref === "__menu__"}
              onClick={() => setIsMenuOpen(true)}
            />
          </li>
        </ul>
      </nav>

      <MobileMenuDrawer open={isMenuOpen} onOpenChange={setIsMenuOpen} />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function MobileNavLink({
  href,
  label,
  icon: Icon,
  badge,
  isActive,
  onClick,
}: {
  href?: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  isActive: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      {/* Aktif zemin — sidebar'daki ile aynı görsel dil, alt çubuğa uyarlanmış */}
      {isActive && (
        <motion.span
          layoutId="mobile-nav-active"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-brand-soft"
        />
      )}

      <span className="relative z-10 flex w-full min-w-0 flex-col items-center gap-1">
        <span className="relative">
          <Icon
            className={cn(
              "size-[21px] transition-colors duration-200",
              isActive ? "text-brand" : "text-muted-foreground",
            )}
            strokeWidth={isActive ? 2.1 : 1.8}
          />
          {badge ? (
            <span className="absolute -right-1.5 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-brand px-1 text-[9.5px] font-semibold tabular-nums text-white ring-2 ring-canvas-subtle">
              {badge}
            </span>
          ) : null}
        </span>

        {/* Faz 11'de öğe sayısı beşe (+ çekmece) çıkınca hücre 375 px'de
            ~62 px'e indi. En uzun etiket "Randevular" 57 px — sığıyor ama
            payı yok. `truncate` bir güvenlik ağı: 320 px'lik bir telefonda
            etiket hücreyi taşırıp çubuğu bozmak yerine kısalıyor. */}
        <span
          className={cn(
            "w-full truncate px-0.5 text-center text-[10.5px] font-medium leading-none transition-colors duration-200",
            isActive ? "text-brand" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </span>
    </>
  );

  const className = cn(
    "relative flex size-full flex-col items-center justify-center",
    "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    "active:scale-[0.96] transition-transform duration-150",
  );

  if (!href) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-expanded={isActive}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      {content}
    </Link>
  );
}
