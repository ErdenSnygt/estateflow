import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowLeft, FileText, Phone } from "lucide-react";

import {
  getCustomerHeader,
  getCustomersWithDocuments,
  getDocumentFilterOptions,
  getDocumentSummary,
  getDocuments,
  getDocumentsForCustomer,
} from "@/lib/data/documents";
import { parseDocumentFilters } from "@/lib/documents-filters";
import { DOCUMENT_TYPES } from "@/lib/documents";
import { formatBytes } from "@/i18n/numbers";
import { single, type SearchParamsInput } from "@/lib/search-params";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { CustomerDocumentSearch } from "@/components/documents/customer-document-search";
import { DocumentDropzone } from "@/components/documents/document-dropzone";
import { DocumentFilterBar } from "@/components/documents/document-filter-bar";
import { DocumentRow } from "@/components/documents/document-row";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("documents.page");
  return { title: t("title") };
}

type PageProps = { searchParams: Promise<SearchParamsInput> };

/**
 * ============================================================================
 * EVRAKLAR — ÜÇ GÖRÜNÜM
 * ============================================================================
 * Faz 12'de bu sayfa tek bir arşiv listesiydi. Faz 18'de varsayılan görünüm
 * MÜŞTERİ ARAMASINA döndü; gerekçe `data/documents.ts` içinde, kısaca: sahada
 * kimse "hangi belgeler var" diye sormuyor, "Ahmet Bey'in tapusu nerede" diye
 * arıyor.
 *
 * Üç görünüm ve ayrımı URL'de:
 *
 *   (varsayılan)      → müşteri arama kutusu + belge sayılı müşteri listesi
 *   ?customer=<id>    → o müşterinin belgeleri + yükleme alanı
 *   ?arsiv=1          → eski tam arşiv listesi, tüm filtreleriyle
 *
 * ARŞİV GÖRÜNÜMÜ KALDIRILMADI ve bu bilinçli: bir müşteriye ya da ilana
 * bağlanmamış belgeler var (`related_customer_id` nullable) ve onlara ulaşan
 * tek yol o liste. Ayrıca "geçen hafta yüklenen sözleşme neydi" gibi bir soru
 * müşteri adından değil tarihten aranıyor.
 *
 * `?customer=` ARŞİVDEKİ FİLTREYLE AYNI ANAHTAR: müşteri detayındaki "Arşivde
 * aç" bağlantısı ve arama sonucundaki kart aynı adrese gidiyor, ikisi de bu
 * görünümü açıyor. Tek anahtar, tek davranış.
 */
export default async function EvraklarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseDocumentFilters(params);
  const isArchive = single(params, "arsiv") === "1";

  if (filters.customer) {
    return <CustomerView customerId={filters.customer} />;
  }

  if (isArchive) {
    return <ArchiveView params={params} />;
  }

  return <SearchView search={single(params, "cq")} />;
}

/* ==========================================================================
   1. Varsayılan: müşteri arama
   ========================================================================== */

async function SearchView({ search }: { search?: string }) {
  /* İkisi bağımsız — paralel. Özet arama sonucundan ETKİLENMİYOR: "toplam kaç
     belge var" sorusu filtrelenmiş listeye göre değişseydi kullanıcı arşivin
     büyüklüğünü hiç göremezdi (Faz 12'den beri geçerli kural). */
  const [customers, summary, t, format] = await Promise.all([
    getCustomersWithDocuments(search),
    getDocumentSummary(),
    getTranslations("documents"),
    getFormatter(),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={t("page.title")}
        description={t("page.searchDescription")}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/evraklar?arsiv=1">
              <FileText className="size-4" />
              {t("page.allArchive")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryTile
          label={t("page.totalLabel")}
          value={String(summary.total)}
          hint={formatBytes(format, summary.totalBytes)}
          emphasis
        />
        {DOCUMENT_TYPES.map((type) => (
          <SummaryTile
            key={type}
            label={t(`type.${type}`)}
            value={String(summary.byType[type])}
            hint={t("page.countUnit")}
          />
        ))}
      </div>

      <CustomerDocumentSearch customers={customers} />
    </div>
  );
}

/* ==========================================================================
   2. Seçili müşteri
   ========================================================================== */

async function CustomerView({ customerId }: { customerId: string }) {
  /* Limit yüksek: görünüm zaten tek bir müşteriye daralmış durumda ve
     "hepsini gör" diye ikinci bir adım istemek anlamsız olurdu. */
  const [customer, documents, t] = await Promise.all([
    getCustomerHeader(customerId),
    getDocumentsForCustomer(customerId, 100),
    getTranslations("documents.customerView"),
  ]);

  if (!customer) {
    return (
      <div className="space-y-6 pb-4">
        <PageHeader
          backHref="/evraklar"
          backLabel={t("notFoundBack")}
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
        />
        <EmptyState
          icon={FileText}
          badge={t("notFoundBadge")}
          title={t("notFoundEmptyTitle")}
          description={t("notFoundEmptyBody")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/evraklar"
        backLabel={t("back")}
        title={t("title", { name: customer.full_name })}
        description={t("description", { count: documents.length })}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href={`/musteriler/${customer.id}`}>
                <ArrowLeft className="size-4" />
                {t("customerRecord")}
              </Link>
            </Button>
            <Button asChild>
              <a href={`tel:${customer.phone.replace(/\s/g, "")}`}>
                <Phone className="size-4" />
                {t("call")}
              </a>
            </Button>
          </>
        }
      />

      {/* Kimlik şeridi: hangi kaydın içinde olduğumuz sayfa kaydırıldığında da
          belli olsun. Başlıktaki ad yeterli değil — liste uzadığında başlık
          ekrandan çıkıyor. */}
      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
        <CustomerAvatar
          name={customer.full_name}
          size={40}
        />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-foreground">
            {customer.full_name}
          </p>
          <p className="truncate text-[12px] tabular-nums text-muted-foreground">
            {customer.phone}
          </p>
        </div>
      </div>

      {/* Bağlam SABİT: müşteri seçici hiç çizilmiyor, zaten belli. */}
      <DocumentDropzone
        customerOptions={[]}
        listingOptions={[]}
        fixedCustomerId={customer.id}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          badge={t("emptyBadge")}
          title={t("emptyTitle")}
          description={t("emptyBody")}
        />
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   3. Tam arşiv
   ========================================================================== */

async function ArchiveView({ params }: { params: SearchParamsInput }) {
  const filters = parseDocumentFilters(params);

  const [documents, options, t, tCommon] = await Promise.all([
    getDocuments(filters),
    getDocumentFilterOptions(),
    getTranslations("documents"),
    getTranslations("common"),
  ]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/evraklar"
        backLabel={t("customerView.back")}
        title={t("archive.title")}
        description={t("archive.description")}
      />

      <DocumentDropzone
        customerOptions={options.customers}
        listingOptions={options.listings}
      />

      {/* Müşteri açılırı burada da duruyor ama seçim yapıldığında sayfa
          `CustomerView`e düşüyor (aynı `?customer=` anahtarı). İstenen de bu:
          arşivde bir müşteriye daralmak, o müşterinin görünümüne geçmek. */}
      <DocumentFilterBar
        customerOptions={options.customers}
        listingOptions={options.listings}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          badge={tCommon("empty")}
          title={t(hasFilters ? "archive.noMatchTitle" : "archive.emptyTitle")}
          description={t(
            hasFilters ? "archive.noMatchBody" : "archive.emptyBody",
          )}
        />
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */

function SummaryTile({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-0.5 p-4">
        <p className="text-[12px] text-muted-foreground">{label}</p>
        <p
          className={
            emphasis
              ? "text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-foreground"
              : "text-[18px] font-semibold tabular-nums text-foreground"
          }
        >
          {value}
        </p>
        <p className="text-[11.5px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
