"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { useFilterParams } from "@/hooks/use-filter-params";
import {
  DEFAULT_WORK_NOTE_FILTER,
  WORK_NOTE_FILTERS,
  WORK_NOTE_TYPES,
  type WorkNoteFilter,
} from "@/lib/work-notes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Radix Select boş string'i değer olarak kabul etmez — "tümü" için nöbetçi. */
const ALL = "all";

/**
 * ============================================================================
 * PANO FİLTRELERİ
 * ============================================================================
 * Dört SEKME + iki daraltma. Sekmeler ayrı çiziliyor çünkü bir açılır menü
 * değiller: kullanıcının panoya bakış açısını belirleyen ana anahtar bu ve
 * hangi görünümde olduğunu tek bakışta görmesi gerekiyor.
 *
 * `?f=` değiştiğinde `?n=` (bildirimden gelen vurgu) DÜŞÜYOR: kullanıcı
 * sekme değiştirdiğinde artık o notu aramıyor, panoya bakıyor.
 *
 * Arama kutusu GECİKMELİ (300 ms) — `DocumentFilterBar` ile aynı gerekçe:
 * her harfte gezinmek "evrak" yazmak için beş sunucu turu açardı.
 */
export function WorkNoteFilterBar({ active }: { active: WorkNoteFilter }) {
  const t = useTranslations("workNotes");
  const tCommon = useTranslations("common");

  const { get, set, setMany } = useFilterParams(["f", "t", "q"]);

  const urlSearch = get("q") ?? "";
  const [search, setSearch] = React.useState(urlSearch);

  React.useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  React.useEffect(() => {
    if (search === urlSearch) return;
    const timer = setTimeout(() => set("q", search || undefined), 300);
    return () => clearTimeout(timer);
  }, [search, urlSearch, set]);

  return (
    <div className="space-y-3">
      {/* --- Sekmeler ---
          Yatay kaydırma mobil için: dört sekme 375 px'de yan yana sığmıyor ve
          alt alta kırılmaları başlık alanını iki katına çıkarıyordu. */}
      <div
        role="tablist"
        aria-label={t("filterBar.viewAria")}
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {WORK_NOTE_FILTERS.map((value) => {
          const isActive = value === active;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() =>
                setMany({
                  f: value === DEFAULT_WORK_NOTE_FILTER ? undefined : value,
                  n: undefined,
                })
              }
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-brand text-brand-foreground"
                  : "bg-surface-inset text-secondary-foreground hover:bg-surface-hover hover:text-foreground",
              )}
            >
              {t(`filter.${value}`)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-surface p-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="note-search"
            className="text-[11.5px] text-muted-foreground"
          >
            {tCommon("search")}
          </Label>
          <Input
            id="note-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("filterBar.searchPlaceholder")}
            className="w-[220px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11.5px] text-muted-foreground">
            {t("filterBar.typeLabel")}
          </Label>
          <Select
            value={get("t") ?? ALL}
            onValueChange={(value) => set("t", value === ALL ? undefined : value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filterBar.allTypes")}</SelectItem>
              {WORK_NOTE_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`type.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
