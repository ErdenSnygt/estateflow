import type { DocumentType } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { counted, maybeRow, rows } from "@/lib/data/query";

/**
 * ============================================================================
 * EVRAK VERİ ERİŞİMİ
 * ============================================================================
 * İMZALI URL BURADA ÜRETİLMİYOR. Liste sayfası 20 belge gösterse de kullanıcı
 * tipik olarak birine tıklıyor; hepsini önden imzalamak 20 imza üretip 19'unu
 * çöpe atmak olurdu. Üstelik imzalar 60 saniyede sönüyor — sayfa açık
 * bırakıldığında hepsi ölürdü.
 *
 * Bunun yerine indirme bir server action üzerinden geçiyor
 * (`lib/actions/documents.ts` → `getDocumentDownloadUrl`): kullanıcı tıklar,
 * imza o an üretilir, tarayıcı hemen kullanır.
 *
 * MESAJ EKLERİNDE TERSİ YAPILDI (`data/messages.ts` hepsini önden imzalıyor):
 * orada ekler sohbet balonunda GÖRSEL olarak çiziliyor, yani tıklama olmadan
 * da adres gerekiyor.
 */

export type DocumentItem = {
  id: string;
  title: string;
  document_type: DocumentType;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  customer: { id: string; full_name: string } | null;
  listing: { id: string; title: string } | null;
  uploader: { id: string; full_name: string; initials: string } | null;
};

export type DocumentFilters = {
  type?: DocumentType;
  customer?: string;
  listing?: string;
  search?: string;
};

const DOCUMENT_SELECT = `
  id, title, document_type, file_url, file_size, mime_type, created_at,
  customer:customers!documents_related_customer_id_fkey(id, full_name),
  listing:listings!documents_related_listing_id_fkey(id, title),
  uploader:agents!documents_uploaded_by_fkey(id, full_name, initials)
`;

export async function getDocuments(
  filters: DocumentFilters = {},
): Promise<DocumentItem[]> {
  const supabase = await createClient();

  let query = supabase.from("documents").select(DOCUMENT_SELECT);

  if (filters.type) query = query.eq("document_type", filters.type);
  if (filters.customer) query = query.eq("related_customer_id", filters.customer);
  if (filters.listing) query = query.eq("related_listing_id", filters.listing);

  /* Başlık araması SUNUCUDA: gömülü ilişkide değil, kendi kolonunda —
     `data/messages.ts`teki durumun tersi. */
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  return rows<DocumentItem>(
    await query.order("created_at", { ascending: false }),
    "Evrak listesi",
  );
}

export async function getDocumentById(id: string): Promise<DocumentItem | null> {
  const supabase = await createClient();

  return maybeRow<DocumentItem>(
    await supabase.from("documents").select(DOCUMENT_SELECT).eq("id", id).maybeSingle(),
    "Evrak",
  );
}

/* ==========================================================================
   Diğer sayfalardaki mini listeler
   ========================================================================== */

/** Müşteri ve ilan detayında gösterilecek ilgili belgeler. */
export async function getDocumentsForCustomer(
  customerId: string,
  limit = 5,
): Promise<DocumentItem[]> {
  const supabase = await createClient();

  return rows<DocumentItem>(
    await supabase
      .from("documents")
      .select(DOCUMENT_SELECT)
      .eq("related_customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(limit),
    "Müşteri evrakları",
  );
}

export async function getDocumentsForListing(
  listingId: string,
  limit = 5,
): Promise<DocumentItem[]> {
  const supabase = await createClient();

  return rows<DocumentItem>(
    await supabase
      .from("documents")
      .select(DOCUMENT_SELECT)
      .eq("related_listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(limit),
    "İlan evrakları",
  );
}

/* ==========================================================================
   Özet
   ========================================================================== */

export type DocumentSummary = {
  total: number;
  /** Tür başına adet — filtre çubuğundaki sayılar. */
  byType: Record<DocumentType, number>;
  totalBytes: number;
};

/**
 * Sayfa başlığındaki özet.
 *
 * Tek sorgu: `count` ile tür kırılımını ayrı ayrı sormak dört ağ turu demekti.
 * Gruplama JavaScript'te — `data/stats.ts` başlığındaki aynı gerekçe.
 */
export async function getDocumentSummary(): Promise<DocumentSummary> {
  const supabase = await createClient();

  const documents = rows<{ document_type: DocumentType; file_size: number }>(
    await supabase.from("documents").select("document_type, file_size"),
    "Evrak özeti",
  );

  const byType: Record<DocumentType, number> = {
    pdf: 0,
    tapu: 0,
    kimlik: 0,
    sozlesme: 0,
  };
  let totalBytes = 0;

  for (const document of documents) {
    byType[document.document_type] += 1;
    totalBytes += document.file_size;
  }

  return { total: documents.length, byType, totalBytes };
}

/** Filtre açılırları — dar sorgular, `data/appointments.ts` ile aynı gerekçe. */
export async function getDocumentFilterOptions(): Promise<{
  customers: { id: string; label: string }[];
  listings: { id: string; label: string }[];
}> {
  const supabase = await createClient();

  const [customerRows, listingRows] = await Promise.all([
    supabase.from("customers").select("id, full_name").order("full_name"),
    supabase
      .from("listings")
      .select("id, title")
      .order("created_at", { ascending: false }),
  ]);

  return {
    customers: rows<{ id: string; full_name: string }>(
      customerRows,
      "Evrak filtresi müşterileri",
    ).map((customer) => ({ id: customer.id, label: customer.full_name })),
    listings: rows<{ id: string; title: string }>(
      listingRows,
      "Evrak filtresi ilanları",
    ).map((listing) => ({ id: listing.id, label: listing.title })),
  };
}

/** Dashboard veya başka bir yerde kullanılabilecek toplam sayaç. */
export async function getDocumentCount(): Promise<number> {
  const supabase = await createClient();

  return counted(
    await supabase.from("documents").select("id", { count: "exact", head: true }),
    "Evrak sayısı",
  );
}
