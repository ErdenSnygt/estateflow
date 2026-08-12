"use client";

import { useTranslations } from "next-intl";

import { useFilterParams } from "@/hooks/use-filter-params";
import { SALE_FILTER_KEYS, OFFER_FILTER_KEYS } from "@/lib/sales-filters";
import {
  OFFER_SORT_KEYS,
  OFFER_STATUSES,
  SALE_SORT_KEYS,
  SORT_MESSAGE_KEY,
} from "@/lib/offers";
import type { AgentOption } from "@/lib/data/agents";
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
 * Satış listesinin filtre çubuğu — Müşteriler'dekiyle aynı desen: URL state,
 * "tümü" nöbetçisi, sayaçlı temizle butonu.
 *
 * DANIŞMAN FİLTRESİ YALNIZCA YÖNETİCİYE GÖSTERİLİYOR. Bir danışman zaten RLS
 * gereği yalnızca kendi satışlarını görüyor; ona "danışman seç" açılırı
 * göstermek tek seçenekli, hiçbir işe yaramayan bir kutu olurdu. Kapı burada
 * değil politikalarda — bu yalnızca gereksiz bir kontrolü gizlemek.
 */
export function SalesFilterBar({
  agentOptions,
}: {
  /** Boş dizi = danışman filtresi gizli. */
  agentOptions: AgentOption[];
}) {
  const t = useTranslations("sales");

  const { get, set, clear, activeCount } = useFilterParams([
    ...SALE_FILTER_KEYS,
  ]);

  return (
    <FilterRow
      activeCount={activeCount}
      onClear={clear}
      className="items-end gap-3 rounded-xl border border-hairline bg-surface p-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="sale-from" className="text-[11.5px] text-muted-foreground">
          {t("filters.from")}
        </Label>
        <Input
          id="sale-from"
          type="date"
          className="w-[160px]"
          value={get("from") ?? ""}
          onChange={(event) => set("from", event.target.value || undefined)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sale-to" className="text-[11.5px] text-muted-foreground">
          {t("filters.to")}
        </Label>
        <Input
          id="sale-to"
          type="date"
          className="w-[160px]"
          value={get("to") ?? ""}
          onChange={(event) => set("to", event.target.value || undefined)}
        />
      </div>

      {agentOptions.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[11.5px] text-muted-foreground">
            {t("filters.agentLabel")}
          </Label>
          <Select
            value={fromParam(get("agent"))}
            onValueChange={(value) => set("agent", toParam(value))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allAgents")}</SelectItem>
              {agentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="ml-auto space-y-1.5">
        <Label className="text-[11.5px] text-muted-foreground">
          {t("sort.label")}
        </Label>
        <Select
          value={get("sort") ?? "recent"}
          onValueChange={(value) =>
            set("sort", value === "recent" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALE_SORT_KEYS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`sort.${SORT_MESSAGE_KEY[value]}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </FilterRow>
  );
}

/** Teklif listesinin filtre çubuğu — aynı desen, farklı alanlar. */
export function OffersFilterBar({
  agentOptions,
}: {
  agentOptions: AgentOption[];
}) {
  const t = useTranslations("offers");

  const { get, set, clear, activeCount } = useFilterParams([
    ...OFFER_FILTER_KEYS,
  ]);

  return (
    <FilterRow
      activeCount={activeCount}
      onClear={clear}
      className="items-end gap-3 rounded-xl border border-hairline bg-surface p-3"
    >
      <div className="space-y-1.5">
        <Label className="text-[11.5px] text-muted-foreground">
          {t("filters.statusLabel")}
        </Label>
        <Select
          value={fromParam(get("status"))}
          onValueChange={(value) => set("status", toParam(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
            {OFFER_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`status.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {agentOptions.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[11.5px] text-muted-foreground">
            {t("filters.agentLabel")}
          </Label>
          <Select
            value={fromParam(get("agent"))}
            onValueChange={(value) => set("agent", toParam(value))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allAgents")}</SelectItem>
              {agentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="ml-auto space-y-1.5">
        <Label className="text-[11.5px] text-muted-foreground">
          {t("sort.label")}
        </Label>
        <Select
          value={get("sort") ?? "recent"}
          onValueChange={(value) =>
            set("sort", value === "recent" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OFFER_SORT_KEYS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`sort.${SORT_MESSAGE_KEY[value]}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </FilterRow>
  );
}
