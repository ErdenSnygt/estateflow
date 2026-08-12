"use client";

import { useTranslations } from "next-intl";

import type { AgentOption } from "@/lib/data/agents";
import { useFilterParams } from "@/hooks/use-filter-params";
import {
  APPOINTMENT_FILTER_KEYS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_PALETTE,
} from "@/lib/appointments";
import { cn } from "@/lib/utils";
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
 * Takvim filtreleri — `SalesFilterBar` ile aynı desen.
 *
 * `view` ve `date` BU ÇUBUĞA DAHİL DEĞİL: onlar filtre değil konum bilgisi ve
 * "Temizle" onlara dokunmuyor (gerekçe `lib/appointments-filters.ts`).
 *
 * Çubuğun sağ ucundaki renk anahtarı ayrıca bir filtre değil, açıklama: beş
 * kategori rengi bir yerde tarif edilmeliydi ve takvimin üstü bunun için
 * doğru yer.
 */
export function AppointmentFilterBar({
  agentOptions,
}: {
  /** Boş dizi = danışman filtresi gizli (danışman zaten kendisini görüyor). */
  agentOptions: AgentOption[];
}) {
  const t = useTranslations("appointments");

  const { get, set, clear, activeCount } = useFilterParams([
    ...APPOINTMENT_FILTER_KEYS,
  ]);

  return (
    <FilterRow
      activeCount={activeCount}
      onClear={clear}
      className="items-end gap-3 rounded-xl border border-hairline bg-surface p-3"
    >
      <div className="space-y-1.5">
        <Label className="text-[11.5px] text-muted-foreground">
          {t("filters.typeLabel")}
        </Label>
        <Select
          value={fromParam(get("type"))}
          onValueChange={(value) => set("type", toParam(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allTypes")}</SelectItem>
            {APPOINTMENT_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`type.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11.5px] text-muted-foreground">
          {t("filters.statusLabel")}
        </Label>
        <Select
          value={fromParam(get("status"))}
          onValueChange={(value) => set("status", toParam(value))}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
            {APPOINTMENT_STATUSES.map((value) => (
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

      {/* Renk anahtarı — dar ekranda gizleniyor, orada zaten satır kaydırılıyor. */}
      <div className="ml-auto hidden flex-wrap items-center gap-x-3 gap-y-1 lg:flex">
        {APPOINTMENT_TYPES.map((value) => (
          <span
            key={value}
            className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
          >
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                APPOINTMENT_TYPE_PALETTE[value].accent,
              )}
            />
            {t(`type.${value}`)}
          </span>
        ))}
      </div>
    </FilterRow>
  );
}
