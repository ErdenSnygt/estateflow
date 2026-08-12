"use client";

import * as React from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { FileText, Search, UserRound } from "lucide-react";

import type { CustomerDocumentSummary } from "@/lib/data/documents";
import { useFilterParams } from "@/hooks/use-filter-params";
import { formatDate } from "@/i18n/dates";
import { Input } from "@/components/ui/input";
import { CustomerAvatar } from "@/components/customers/customer-avatar";

/**
 * ============================================================================
 * EVRAK SAYFASININ GİRİŞ EKRANI — MÜŞTERİ ARAMA
 * ============================================================================
 * Faz 18'de `/evraklar` varsayılan görünümü değişti: önce büyük bir arama
 * kutusu, müşteri seçilince o müşterinin belgeleri. Gerekçe
 * `data/documents.ts` → `getCustomersWithDocuments` başlığında.
 *
 * -----------------------------------------------------------------------------
 * ARAMA URL'DE (`?cq=`), BİLEŞEN DURUMUNDA DEĞİL
 * -----------------------------------------------------------------------------
 * Filtreleme SUNUCUDA yapılıyor (ad ve telefon üzerinde `ilike`), yani listenin
 * tamamını tarayıcıya taşımak gerekmiyor — 400 müşterili bir ofiste bu fark
 * eder. Bedeli, her aramanın bir gezinme olması; 300 ms gecikme onu ödüyor
 * (`DocumentFilterBar` ile aynı desen).
 *
 * Anahtar `q` DEĞİL `cq`: `q` arşiv görünümünde belge başlığını arıyor ve
 * ikisi aynı parametreyi paylaşsaydı, müşteri arayıp arşive geçen kullanıcı
 * anlamsız bir belge filtresiyle karşılaşırdı.
 */
export function CustomerDocumentSearch({
  customers,
}: {
  customers: CustomerDocumentSummary[];
}) {
  const t = useTranslations("documents.search");
  const format = useFormatter();

  const { get, set } = useFilterParams(["cq"]);

  const urlSearch = get("cq") ?? "";
  const [search, setSearch] = React.useState(urlSearch);

  React.useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  React.useEffect(() => {
    if (search === urlSearch) return;
    const timer = setTimeout(() => set("cq", search || undefined), 300);
    return () => clearTimeout(timer);
  }, [search, urlSearch, set]);

  return (
    <div className="space-y-4">
      {/* --- Arama kutusu --- */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("aria")}
          className="h-12 pl-11 text-[15px]"
        />
      </div>

      {/* --- Sonuçlar --- */}
      {customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface-inset px-6 py-10 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-surface text-muted-foreground">
            <UserRound className="size-5" />
          </span>
          <p className="mt-3 text-[13.5px] font-medium text-foreground">
            {t(urlSearch ? "noMatchTitle" : "emptyTitle")}
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t(urlSearch ? "noMatchBody" : "emptyBody")}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/evraklar?customer=${customer.id}`}
              className="surface-card-interactive flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3"
            >
              <CustomerAvatar
                name={customer.full_name}
                size={40}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-foreground">
                  {customer.full_name}
                </p>
                <p className="truncate text-[11.5px] tabular-nums text-muted-foreground">
                  {customer.documentCount > 0 && customer.lastDocumentAt
                    ? t("lastDocument", {
                        date: formatDate(
                          format,
                          customer.lastDocumentAt,
                          "short",
                        ),
                      })
                    : customer.phone}
                </p>
              </div>

              {/* Sayı YALNIZCA VARSA. "0 belge" yazan bir rozet bilgi vermiyor;
                  belgesiz müşteri listede kalıyor çünkü kullanıcı çoğu zaman
                  oraya ilk belgeyi yüklemeye geliyor. */}
              {customer.documentCount > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-md bg-brand-soft px-2 py-1 text-[11.5px] font-medium tabular-nums text-brand">
                  <FileText className="size-3" />
                  {customer.documentCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
