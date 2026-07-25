"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarPlus, SearchX, UserPlus } from "lucide-react";

import { navigation } from "@/config/navigation";
import { useMetaKey } from "@/hooks/use-meta-key";
import { Kbd } from "@/components/ui/kbd";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

/** Faz 2'de gerçek formlara bağlanacak hızlı eylemler. */
const quickActions = [
  { label: "Yeni ilan ekle", icon: Building2, shortcut: "N" },
  { label: "Yeni müşteri ekle", icon: UserPlus, shortcut: "M" },
  { label: "Randevu oluştur", icon: CalendarPlus, shortcut: "R" },
];

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const metaKey = useMetaKey();

  // Cmd/Ctrl + K global kısayolu
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const runCommand = React.useCallback(
    (action: () => void) => {
      onOpenChange(false);
      action();
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Sayfa, müşteri veya ilan ara…" />

      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-hairline bg-surface-inset">
              <SearchX className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-[13.5px] font-medium text-secondary-foreground">
                Sonuç bulunamadı
              </p>
              <p className="text-[12px] text-muted-foreground">
                Farklı bir anahtar kelime deneyin.
              </p>
            </div>
          </div>
        </CommandEmpty>

        <CommandGroup heading="Hızlı eylemler">
          {quickActions.map((action) => (
            <CommandItem
              key={action.label}
              value={action.label}
              onSelect={() => runCommand(() => {})}
            >
              <action.icon className="text-brand" />
              <span>{action.label}</span>
              <CommandShortcut>
                {metaKey} {action.shortcut}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {navigation.map((group) => (
          <CommandGroup key={group.paletteTitle} heading={group.paletteTitle}>
            {group.items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.description}`}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="text-muted-foreground" />
                <span>{item.label}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Sayfaya git
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      {/* Alt bilgi çubuğu — klavye ipuçları */}
      <div className="flex items-center gap-4 border-t border-hairline bg-surface-inset/60 px-5 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          gezin
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Kbd>↵</Kbd>
          seç
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Kbd>esc</Kbd>
          kapat
        </span>
      </div>
    </CommandDialog>
  );
}
