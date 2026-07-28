"use client";

import * as React from "react";
import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFilterParams } from "@/hooks/use-filter-params";
import { FILTER_KEYS } from "@/lib/listings-filters";
import {
  CATEGORY_OPTIONS,
  CITY_OPTIONS,
  ROOM_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  districtsOf,
} from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FilterRow } from "@/components/filters/filter-row";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export function ListingsFilterBar() {
  const { get, set, setMany, clear, activeCount } = useFilterParams(FILTER_KEYS);

  const city = get("city");
  const districts = districtsOf(city);

  /* --- Arama: yazarken her tuşta gezinmemek için geciktiriyoruz --- */
  const searchParam = get("q") ?? "";
  const [search, setSearch] = React.useState(searchParam);

  // Geri tuşu veya "temizle" URL'i değiştirdiğinde input'u eşitle.
  React.useEffect(() => {
    setSearch(searchParam);
  }, [searchParam]);

  React.useEffect(() => {
    if (search === searchParam) return;
    const timer = setTimeout(() => set("q", search || undefined), 350);
    return () => clearTimeout(timer);
  }, [search, searchParam, set]);

  const viewMode = get("view") === "list" ? "list" : "grid";

  return (
    <div className="space-y-3">
      {/* --- Üst sıra: arama, sıralama, görünüm --- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Başlık, ilçe veya ilan no ile ara…"
            className="pl-10"
            aria-label="İlanlarda ara"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Aramayı temizle"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={get("sort") ?? "newest"}
            onValueChange={(value) => set("sort", value)}
          >
            <SelectTrigger className="w-[186px]" aria-label="Sıralama">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-0.5 rounded-lg border border-hairline bg-surface-inset p-1">
            <ViewToggle
              active={viewMode === "grid"}
              onClick={() => set("view", undefined)}
              label="Izgara görünümü"
            >
              <LayoutGrid className="size-4" />
            </ViewToggle>
            <ViewToggle
              active={viewMode === "list"}
              onClick={() => set("view", "list")}
              label="Liste görünümü"
            >
              <List className="size-4" />
            </ViewToggle>
          </div>
        </div>
      </div>

      {/* --- Alt sıra: filtreler ---
          Mobilde bu yedi kontrol bir çekmeceye giriyor; gerekçe
          `components/filters/filter-row.tsx` başlığında. */}
      <FilterRow activeCount={activeCount} onClear={clear}>
        <FilterSelect
          label="Kategori"
          value={fromParam(get("category"))}
          onChange={(value) => set("category", toParam(value))}
          options={CATEGORY_OPTIONS}
          allLabel="Tüm kategoriler"
        />

        <FilterSelect
          label="Durum"
          value={fromParam(get("status"))}
          onChange={(value) => set("status", toParam(value))}
          options={STATUS_OPTIONS}
          allLabel="Tüm durumlar"
        />

        <FilterSelect
          label="Şehir"
          value={fromParam(city)}
          // Şehir değişince ilçe geçersiz kalır; ikisini birlikte güncelliyoruz.
          onChange={(value) =>
            setMany({ city: toParam(value), district: undefined })
          }
          options={CITY_OPTIONS}
          allLabel="Tüm şehirler"
        />

        <FilterSelect
          label="İlçe"
          value={fromParam(get("district"))}
          onChange={(value) => set("district", toParam(value))}
          options={districts.map((district) => ({
            value: district,
            label: district,
          }))}
          allLabel="Tüm ilçeler"
          disabled={!city}
          width="w-[152px]"
        />

        <FilterSelect
          label="Oda"
          value={fromParam(get("rooms"))}
          onChange={(value) => set("rooms", toParam(value))}
          options={ROOM_OPTIONS}
          allLabel="Tüm oda sayıları"
          width="w-[148px]"
        />

        <RangeFilter
          label="Fiyat"
          unit="₺"
          minValue={get("minPrice")}
          maxValue={get("maxPrice")}
          onApply={(min, max) => setMany({ minPrice: min, maxPrice: max })}
        />

        <RangeFilter
          label="Alan"
          unit="m²"
          minValue={get("minArea")}
          maxValue={get("maxArea")}
          onApply={(min, max) => setMany({ minArea: min, maxArea: max })}
        />

      </FilterRow>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ViewToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded-md p-1.5 transition-colors duration-150",
        active
          ? "bg-surface-active text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  disabled,
  width = "w-[164px]",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
  disabled?: boolean;
  width?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
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

/**
 * Min–maks aralığı. Değerler popover kapanınca değil, "Uygula" ile yazılır —
 * her tuş vuruşunda gezinmek tarayıcı geçmişini kirletir.
 */
function RangeFilter({
  label,
  unit,
  minValue,
  maxValue,
  onApply,
}: {
  label: string;
  unit: string;
  minValue: string | undefined;
  maxValue: string | undefined;
  onApply: (min: string | undefined, max: string | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [min, setMin] = React.useState(minValue ?? "");
  const [max, setMax] = React.useState(maxValue ?? "");

  // Popover her açılışta URL'deki güncel değerle başlasın.
  React.useEffect(() => {
    if (open) {
      setMin(minValue ?? "");
      setMax(maxValue ?? "");
    }
  }, [open, minValue, maxValue]);

  const isActive = Boolean(minValue || maxValue);

  function apply() {
    onApply(min || undefined, max || undefined);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            "gap-1.5 bg-surface-inset font-normal",
            isActive && "border-hairline-strong text-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          {label}
          {isActive && (
            <Badge variant="brand" className="ml-0.5">
              1
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[280px] space-y-3">
        <p className="text-[13px] font-medium text-foreground">
          {label} aralığı ({unit})
        </p>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor={`${label}-min`} className="text-[12px]">
              En az
            </Label>
            <Input
              id={`${label}-min`}
              type="number"
              min={0}
              inputMode="numeric"
              value={min}
              onChange={(event) => setMin(event.target.value)}
              placeholder="0"
              className="h-9 px-3"
            />
          </div>
          <span className="pb-2.5 text-muted-foreground">–</span>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor={`${label}-max`} className="text-[12px]">
              En çok
            </Label>
            <Input
              id={`${label}-max`}
              type="number"
              min={0}
              inputMode="numeric"
              value={max}
              onChange={(event) => setMax(event.target.value)}
              placeholder="∞"
              className="h-9 px-3"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={apply} className="flex-1">
            Uygula
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMin("");
              setMax("");
              onApply(undefined, undefined);
              setOpen(false);
            }}
          >
            Sıfırla
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
