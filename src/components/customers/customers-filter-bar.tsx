"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFilterParams } from "@/hooks/use-filter-params";
import { CUSTOMER_FILTER_KEYS } from "@/lib/customers-filters";
import {
  BUDGET_BANDS,
  CUSTOMER_SORT_KEYS,
  CUSTOMER_SORT_MESSAGE_KEY,
  CUSTOMER_STATUSES,
} from "@/lib/customers";
import type { AgentOption } from "@/lib/data/agents";
import { Input } from "@/components/ui/input";
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
 * İlanlar'daki filtre çubuğuyla aynı desen: URL state, 350 ms geciktirilmiş
 * arama, "tümü" nöbetçisi, sayaçlı temizle butonu.
 *
 * Bütçe iki anahtar (`minBudget`/`maxBudget`) ile tutulur ama kullanıcıya tek
 * bir açılır olarak görünür — hazır bantlar aralık girmekten daha hızlı.
 *
 * Danışman seçenekleri prop olarak geliyor: liste Faz 5'te veritabanına taşındı
 * ve bir istemci bileşeni onu doğrudan okuyamaz. Sunucu sayfası bir kez çekip
 * buraya veriyor.
 */
export function CustomersFilterBar({
  agentOptions,
}: {
  agentOptions: AgentOption[];
}) {
  const t = useTranslations("customers.list");
  const tStatus = useTranslations("customers.status");
  const tSort = useTranslations("customers.sort");
  const tBudget = useTranslations("customers.budget");

  const { get, set, setMany, clear, activeCount } = useFilterParams([
    ...CUSTOMER_FILTER_KEYS,
  ]);

  const searchParam = get("q") ?? "";
  const [search, setSearch] = React.useState(searchParam);

  React.useEffect(() => {
    setSearch(searchParam);
  }, [searchParam]);

  React.useEffect(() => {
    if (search === searchParam) return;
    const timer = setTimeout(() => set("q", search || undefined), 350);
    return () => clearTimeout(timer);
  }, [search, searchParam, set]);

  /* Bütçe bandı URL'de iki sayı; açılırda tek değer olarak temsil edilir. */
  const budgetValue =
    get("minBudget") || get("maxBudget")
      ? `${get("minBudget") ?? 0}-${get("maxBudget") ?? 0}`
      : ALL;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
            aria-label={t("searchAria")}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("clearSearch")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={get("sort") ?? "recent"}
          onValueChange={(value) => set("sort", value)}
        >
          <SelectTrigger className="sm:w-[210px]" aria-label={tSort("label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CUSTOMER_SORT_KEYS.map((value) => (
              <SelectItem key={value} value={value}>
                {tSort(CUSTOMER_SORT_MESSAGE_KEY[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobilde çekmeceye giriyor — `components/filters/filter-row.tsx`. */}
      <FilterRow activeCount={activeCount} onClear={clear}>
        <FilterSelect
          label={t("statusLabel")}
          value={fromParam(get("status"))}
          onChange={(value) => set("status", toParam(value))}
          options={CUSTOMER_STATUSES.map((value) => ({
            value,
            label: tStatus(value),
          }))}
          allLabel={t("allStatuses")}
        />

        <FilterSelect
          label={t("agentLabel")}
          value={fromParam(get("agent"))}
          onChange={(value) => set("agent", toParam(value))}
          options={agentOptions}
          allLabel={t("allAgents")}
          width="w-[186px]"
        />

        <FilterSelect
          label={t("budgetLabel")}
          value={budgetValue}
          onChange={(value) => {
            if (value === ALL) {
              setMany({ minBudget: undefined, maxBudget: undefined });
              return;
            }
            const [min, max] = value.split("-");
            setMany({
              minBudget: min === "0" ? undefined : min,
              maxBudget: max === "0" ? undefined : max,
            });
          }}
          options={BUDGET_BANDS.map((band) => ({
            value: band.value,
            label: tBudget(band.key),
          }))}
          allLabel={t("allBudgets")}
          width="w-[172px]"
        />

      </FilterRow>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  width = "w-[164px]",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
  width?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        aria-label={label}
        className={cn(
          width,
          value !== ALL && "border-hairline-strong text-foreground",
        )}
      >
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
