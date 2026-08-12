"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

/** Faz 2'de gerçek formlara bağlanacak hızlı eylemler.
    Etiket ARTIK ANAHTAR (Faz 19); metin sözlükten geliyor. */
const quickActions = [
  { key: "newListing", icon: Building2, shortcut: "N" },
  { key: "newCustomer", icon: UserPlus, shortcut: "M" },
  { key: "newAppointment", icon: CalendarPlus, shortcut: "R" },
] as const;

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const metaKey = useMetaKey();
  const t = useTranslations();

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
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("commandPalette.dialogTitle")}
      description={t("commandPalette.description")}
    >
      <CommandInput placeholder={t("commandPalette.placeholder")} />

      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-hairline bg-surface-inset">
              <SearchX className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-[13.5px] font-medium text-secondary-foreground">
                {t("commandPalette.emptyTitle")}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {t("commandPalette.emptyHint")}
              </p>
            </div>
          </div>
        </CommandEmpty>

        <CommandGroup heading={t("commandPalette.quickActions")}>
          {quickActions.map((action) => (
            <CommandItem
              key={action.key}
              /* `value` ARAMA ANAHTARI: cmdk kullanıcının yazdığını buna göre
                 eşliyor. Çevrilmiş metin verilmezse İngilizce arayüzde
                 "listing" yazan kullanıcı hiçbir şey bulamazdı. */
              value={t(`commandPalette.${action.key}`)}
              onSelect={() => runCommand(() => {})}
            >
              <action.icon className="text-brand" />
              <span>{t(`commandPalette.${action.key}`)}</span>
              <CommandShortcut>
                {metaKey} {action.shortcut}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {navigation.map((group) => (
          <CommandGroup
            key={group.key}
            heading={t(`nav.groups.${group.key}`)}
          >
            {group.items.map((item) => (
              <CommandItem
                key={item.href}
                /* Açıklama da aramaya dahil: kullanıcı "prim" yazınca
                   Gelirler çıksın diye. İkisi de çevrilmiş metinden. */
                value={`${t(`nav.${item.key}.label`)} ${t(`nav.${item.key}.description`)}`}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="text-muted-foreground" />
                <span>{t(`nav.${item.key}.label`)}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {t("commandPalette.goToPage")}
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
          {t("commandPalette.hintNavigate")}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Kbd>↵</Kbd>
          {t("commandPalette.hintSelect")}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Kbd>esc</Kbd>
          {t("commandPalette.hintClose")}
        </span>
      </div>
    </CommandDialog>
  );
}
