"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  Globe,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Moon,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { findNavItem } from "@/config/navigation";
import { useMetaKey } from "@/hooks/use-meta-key";
import { signOut } from "@/lib/auth/client";
import { useSessionUser } from "@/components/layout/session-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const languages = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
] as const;

type NavbarProps = {
  onOpenSearch: () => void;
};

export function Navbar({ onOpenSearch }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const metaKey = useMetaKey();
  const user = useSessionUser();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    /* Sunucu bileşenlerinin önbelleğe alınmış çıktısı hâlâ oturumlu hâli
       tutuyor; tazelenmezse kullanıcı adı çıkıştan sonra da görünür. */
    router.refresh();
  }

  const activeItem = findNavItem(pathname);
  const title = activeItem?.label ?? "Emlak CRM";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 px-4 sm:px-6",
        "border-b border-hairline bg-canvas/80 backdrop-blur-xl",
      )}
    >
      {/* --- Sol: dinamik sayfa başlığı ------------------------------------ */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="truncate text-[17px] font-semibold tracking-[-0.02em] text-foreground"
        >
          {title}
        </motion.h1>
      </div>

      {/* --- Sağ: araçlar ---------------------------------------------------
          MOBİLDE YALNIZCA ÜÇ ŞEY: arama, bildirim, profil. Altı ikon 375 px'de
          başlığı ezip kendisi de sıkışıyordu. Mesajlar, tema, dil ve hesap
          menüsünün tamamı alt çubuktaki "Daha Fazla" çekmecesine taşındı —
          gezinme zaten oraya taşındığı için kullanıcı onu açmayı biliyor. */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Mobil arama — masaüstündeki geniş kutunun ikon hâli */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Ara"
          className={cn(
            "flex size-9 items-center justify-center rounded-lg text-muted-foreground md:hidden",
            "transition-colors duration-200 hover:bg-surface-hover hover:text-foreground",
          )}
        >
          <Search className="size-[18px]" />
        </button>

        {/* Arama — tıklayınca komut paletini açar */}
        <button
          type="button"
          onClick={onOpenSearch}
          className={cn(
            "group hidden h-9 w-56 items-center gap-2.5 rounded-lg px-3 md:flex",
            "border border-hairline bg-surface-inset text-[13px] text-muted-foreground",
            "transition-all duration-200 ease-[var(--ease-out-quint)]",
            "hover:border-hairline-strong hover:bg-surface hover:text-secondary-foreground",
          )}
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Ara…</span>
          <Kbd className="transition-colors group-hover:border-hairline-strong">
            {metaKey}
          </Kbd>
          <Kbd className="transition-colors group-hover:border-hairline-strong">
            K
          </Kbd>
        </button>

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-5 md:block"
        />

        <IconButton
          label="Bildirimler"
          href="/bildirimler"
          icon={Bell}
          hasIndicator
        />
        <IconButton
          label="Mesajlar"
          href="/mesajlar"
          icon={MessageSquare}
          className="hidden md:flex"
        />

        {/* Tema — şu an tek tema var, UI hazır dursun */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "hidden size-9 items-center justify-center rounded-lg text-muted-foreground md:flex",
                "transition-colors duration-200 hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <Moon className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Açık tema yakında</TooltipContent>
        </Tooltip>

        {/* Dil seçimi — UI hazır, seçim henüz uygulanmıyor */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Dil seçimi"
              className={cn(
                "hidden size-9 items-center justify-center rounded-lg text-muted-foreground md:flex",
                "transition-colors duration-200 hover:bg-surface-hover hover:text-foreground",
                "data-[state=open]:bg-surface-hover data-[state=open]:text-foreground",
              )}
            >
              <Globe className="size-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuLabel>Dil</DropdownMenuLabel>
            {languages.map((language) => (
              <DropdownMenuItem key={language.code}>
                <span>{language.label}</span>
                {language.code === "tr" && (
                  <Check className="ml-auto size-4 text-brand" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-5 md:block"
        />

        {/* Profil — mobilde de kalıyor: hesap menüsü çekmecede de var ama
            avatarın üstte durması "kim olarak bakıyorum" sorusunu tek bakışta
            yanıtlıyor ve rol değiştirme testlerinde bu önemli oldu. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Hesap menüsü"
              className={cn(
                "rounded-full outline-none transition-all duration-200",
                "ring-1 ring-hairline-strong hover:ring-2 hover:ring-brand/50",
                "focus-visible:ring-2 focus-visible:ring-ring",
                "data-[state=open]:ring-2 data-[state=open]:ring-brand/60",
              )}
            >
              <Avatar className="size-9">
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-[15rem]">
            <div className="flex items-center gap-3 px-2.5 py-2">
              <Avatar className="size-9">
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {user.name}
                </p>
                <p className="truncate text-[11.5px] text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <UserRound />
              Profilim
              <DropdownMenuShortcut>{metaKey}P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/ayarlar">
                <Settings />
                Ayarlar
                <DropdownMenuShortcut>{metaKey},</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy />
              Destek
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="danger" onSelect={handleSignOut}>
              <LogOut />
              Çıkış yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/** Navbar'daki ikon butonları — rozet noktası opsiyonel. */
function IconButton({
  label,
  href,
  icon: Icon,
  hasIndicator,
  className,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  hasIndicator?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          className={cn(
            "relative flex size-9 items-center justify-center rounded-lg text-muted-foreground",
            "transition-colors duration-200 hover:bg-surface-hover hover:text-foreground",
            className,
          )}
        >
          <Icon className="size-[18px]" />
          {hasIndicator && (
            <span className="absolute right-2 top-2 size-2 rounded-full bg-brand ring-2 ring-canvas" />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
