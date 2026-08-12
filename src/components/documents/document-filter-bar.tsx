"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { useFilterParams } from "@/hooks/use-filter-params";
import { DOCUMENT_TYPES } from "@/lib/documents";
import { DOCUMENT_FILTER_KEYS } from "@/lib/documents-filters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterRow } from "@/components/filters/filter-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Radix Select boş string'i değer olarak kabul etmez — "tümü" için nöbetçi. */
const ALL = "all";
const toParam = (value: string) => (value === ALL ? undefined : value);
const fromParam = (value: string | undefined) => value ?? ALL;

/**
 * Evrak filtre çubuğu — `SalesFilterBar` ile aynı desen.
 *
 * ARAMA KUTUSU GECİKMELİ (300 ms). Diğer filtreler açılır menü, yani tek
 * tıklama = tek gezinme. Arama her harfte URL'i değiştirseydi "sözleşme"
 * yazmak sekiz ayrı sunucu turu açardı.
 */
export function DocumentFilterBar({
  customerOptions,
  listingOptions,
}: {
  customerOptions: { id: string; label: string }[];
  listingOptions: { id: string; label: string }[];
}) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");

  const { get, set, clear, activeCount } = useFilterParams([
    ...DOCUMENT_FILTER_KEYS,
  ]);

  const urlSearch = get("q") ?? "";
  const [search, setSearch] = React.useState(urlSearch);

  /* URL dışarıdan değişirse (temizle butonu, geri tuşu) kutu ona uysun. */
  React.useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  React.useEffect(() => {
    if (search === urlSearch) return;
    const timer = setTimeout(() => set("q", search || undefined), 300);
    return () => clearTimeout(timer);
  }, [search, urlSearch, set]);

  return (
    <FilterRow
      activeCount={activeCount}
      onClear={clear}
      className="items-end gap-3 rounded-xl border border-hairline bg-surface p-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="document-search" className="text-[11.5px] text-muted-foreground">
          {tCommon("search")}
        </Label>
        <Input
          id="document-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("filterBar.searchPlaceholder")}
          className="w-[200px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11.5px] text-muted-foreground">
          {t("filterBar.typeLabel")}
        </Label>
        <Select
          value={fromParam(get("type"))}
          onValueChange={(value) => set("type", toParam(value))}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterBar.allTypes")}</SelectItem>
            {DOCUMENT_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`type.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11.5px] text-muted-foreground">
          {t("filterBar.customerLabel")}
        </Label>
        <Select
          value={fromParam(get("customer"))}
          onValueChange={(value) => set("customer", toParam(value))}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterBar.allCustomers")}</SelectItem>
            {customerOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11.5px] text-muted-foreground">
          {t("filterBar.listingLabel")}
        </Label>
        <Select
          value={fromParam(get("listing"))}
          onValueChange={(value) => set("listing", toParam(value))}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterBar.allListings")}</SelectItem>
            {listingOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FilterRow>
  );
}
