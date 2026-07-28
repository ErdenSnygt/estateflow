"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Moon, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { navigation } from "@/config/navigation";
import { signOut } from "@/lib/auth/client";
import { AGENT_ROLE_LABELS } from "@/lib/agents";
import { useSessionUser } from "@/components/layout/session-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Mobil menü çekmecesi — alt çubuktaki "Daha Fazla" öğesinin karşılığı.
 *
 * Sidebar'ın mobil karşılığı: aynı `navigation` config'inden besleniyor, aynı
 * gruplama ve aynı rozetlerle. Ayrı bir menü listesi YAZILMADI — 13 öğe iki
 * yerde tutulsaydı biri diğerinden sapardı.
 *
 * Kullanıcı kartı ve çıkış da burada: masaüstünde bunlar sidebar'ın üstünde ve
 * navbar'daki profil menüsünde duruyor, mobilde navbar sadeleştiği için tek
 * erişim noktası çekmece.
 */
export function MobileMenuDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionUser();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    /* Sunucu bileşenlerinin önbelleği hâlâ oturumlu hâli tutuyor. */
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <div className="min-w-0">
            <SheetTitle>Menü</SheetTitle>
            <SheetDescription>Tüm bölümler ve hesap ayarları</SheetDescription>
          </div>
          <SheetCloseButton />
        </SheetHeader>

        <SheetBody>
          {/* --- Kullanıcı --- */}
          <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
            <Avatar className="size-10 shrink-0 ring-1 ring-hairline-strong">
              <AvatarFallback>{user.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">
                {user.email}
              </p>
            </div>
            {user.agentRole && (
              <Badge variant="neutral">{AGENT_ROLE_LABELS[user.agentRole]}</Badge>
            )}
          </div>

          {/* --- Menü grupları --- */}
          <div className="mt-4 space-y-4">
            {navigation.map((group) => (
              <div key={group.paletteTitle}>
                <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.title ?? group.paletteTitle}
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2.5",
                          "text-[13.5px] font-medium transition-colors duration-200",
                          isActive
                            ? "border-hairline-strong bg-brand-soft text-foreground"
                            : "border-transparent bg-surface text-secondary-foreground active:bg-surface-active",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0",
                            isActive ? "text-brand" : "text-muted-foreground",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span
                            className={cn(
                              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
                              "text-[10.5px] font-semibold tabular-nums",
                              isActive
                                ? "bg-brand text-white"
                                : "bg-surface-active text-secondary-foreground",
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* --- Hesap işlemleri ---
              Masaüstünde navbar'daki profil menüsünde duran şeyler. Tema ve dil
              hâlâ işlevsiz (tek tema, tek dil) ama arayüz hazır — masaüstüyle
              aynı durumda tutuluyor. */}
          <div className="space-y-1.5 pb-2">
            <Link
              href="/ayarlar"
              className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5 text-[13.5px] font-medium text-secondary-foreground transition-colors active:bg-surface-active"
            >
              <Settings className="size-[18px] text-muted-foreground" />
              Ayarlar
            </Link>

            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5 text-[13.5px] font-medium text-muted-foreground disabled:opacity-60"
            >
              <Moon className="size-[18px]" />
              Açık tema
              <span className="ml-auto text-[11.5px]">yakında</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5",
                "bg-danger-soft text-[13.5px] font-medium text-danger",
                "transition-opacity active:opacity-80",
              )}
            >
              <LogOut className="size-[18px]" />
              Çıkış yap
            </button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
