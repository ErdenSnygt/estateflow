"use server";

import { revalidatePath } from "next/cache";

import type { DocumentType } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import { removeDocumentObjects } from "@/lib/storage/cleanup";
import { signedUrlFor } from "@/lib/storage/signed";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";

/**
 * ============================================================================
 * EVRAK İŞLEMLERİ
 * ============================================================================
 * Dosyanın kendisi tarayıcıdan private bucket'a yükleniyor
 * (`lib/storage/upload-document.ts`); buraya yalnızca NESNE YOLU geliyor.
 * Faz 7'deki görsel akışıyla aynı iş bölümü ve aynı gerekçeler.
 */

function revalidateDocuments(customerId?: string | null, listingId?: string | null) {
  revalidatePath("/evraklar");
  if (customerId) revalidatePath(`/musteriler/${customerId}`);
  if (listingId) revalidatePath(`/ilanlar/${listingId}`);
}

/* ==========================================================================
   Kayıt
   ========================================================================== */

export type CreateDocumentInput = {
  title: string;
  type: DocumentType;
  /** `uploadDocument()` çıktısındaki yol. */
  path: string;
  size: number;
  mimeType: string;
  customerId?: string | null;
  listingId?: string | null;
};

export async function createDocument(
  input: CreateDocumentInput,
): Promise<ActionResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return fail("Belge başlığı boş olamaz.");
  if (!input.path) return fail("Dosya yüklenemedi; tekrar deneyin.");

  const agent = await getCurrentAgent();
  if (!agent?.is_active) {
    return fail("Personel kaydınız bulunamadı; belge kaydedilemiyor.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .insert({
      title,
      document_type: input.type,
      file_url: input.path,
      file_size: input.size,
      mime_type: input.mimeType,
      related_customer_id: input.customerId || null,
      related_listing_id: input.listingId || null,
      uploaded_by: agent.id,
    })
    .select("id")
    .single();

  if (error) {
    /* Satır yazılamadıysa yüklenen dosya yetim kalır — hemen siliniyor. */
    await removeDocumentObjects([input.path]);
    return fail(toMessage(error));
  }

  revalidateDocuments(input.customerId, input.listingId);
  return ok({ id: data.id });
}

/* ==========================================================================
   Düzenleme
   ========================================================================== */

/** Yalnızca üstveri: dosyanın kendisi değişmiyor, yeni sürüm yeni kayıt. */
export async function updateDocument(
  id: string,
  input: {
    title?: string;
    type?: DocumentType;
    customerId?: string | null;
    listingId?: string | null;
  },
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("documents")
    .select("id, related_customer_id, related_listing_id")
    .eq("id", id)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!current) return fail("Belge bulunamadı.");

  const title = input.title?.trim();
  if (input.title !== undefined && !title) {
    return fail("Belge başlığı boş olamaz.");
  }

  const { error } = await supabase
    .from("documents")
    .update({
      ...(title ? { title } : {}),
      ...(input.type ? { document_type: input.type } : {}),
      ...(input.customerId !== undefined
        ? { related_customer_id: input.customerId || null }
        : {}),
      ...(input.listingId !== undefined
        ? { related_listing_id: input.listingId || null }
        : {}),
    })
    .eq("id", id);

  if (error) return fail(toMessage(error));

  revalidateDocuments(
    input.customerId ?? current.related_customer_id,
    input.listingId ?? current.related_listing_id,
  );
  return ok({ id });
}

/* ==========================================================================
   Silme
   ========================================================================== */

export async function deleteDocument(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("file_url, related_customer_id, related_listing_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return fail(toMessage(error));

  /* Satır gittikten SONRA dosya: ters sırada olsaydı silme yarıda kalınca
     kaydı olan ama dosyası olmayan bir belge kalırdı. */
  if (document?.file_url) {
    await removeDocumentObjects([document.file_url]);
  }

  revalidateDocuments(document?.related_customer_id, document?.related_listing_id);
  return ok({ id });
}

/* ==========================================================================
   İndirme
   ========================================================================== */

/**
 * Tıklama anında imzalı indirme adresi üretir.
 *
 * -----------------------------------------------------------------------------
 * NEDEN LİSTEDE ÖNDEN ÜRETİLMİYOR
 * -----------------------------------------------------------------------------
 * İmza 60 saniyede sönüyor. Sayfa açıldığında 20 belgenin hepsini imzalamak,
 * kullanıcı bir dakika sonra tıkladığında hepsinin ölü olması demekti — ve
 * 19'u zaten hiç kullanılmayacaktı. Bu action tıklandığı an çağrılıyor,
 * dönen adres hemen kullanılıyor.
 *
 * BELGE SATIRI ÖNCE OKUNUYOR ve bu bir güvenlik adımı: okuma RLS'e tabi, yani
 * satırı göremeyen kullanıcı yola da erişemiyor. Storage politikası bilerek
 * geniş (`0009_documents_storage.sql`), asıl kapı burası.
 */
export async function getDocumentDownloadUrl(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("file_url, title, mime_type")
    .eq("id", id)
    .maybeSingle();

  if (error) return fail(toMessage(error));
  if (!document) return fail("Belge bulunamadı ya da erişim yetkiniz yok.");

  /* İndirilen dosyanın adı uuid değil, belgenin başlığı olsun: kullanıcı
     "Tapu — Kadıköy.pdf" bekliyor, "9f3a…-b1.pdf" değil. */
  const extension = document.file_url.split(".").pop() ?? "";
  const safeTitle = document.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
  const fileName = extension ? `${safeTitle}.${extension}` : safeTitle;

  const url = await signedUrlFor(document.file_url, { download: fileName });
  if (!url) return fail("İndirme bağlantısı üretilemedi. Tekrar deneyin.");

  return ok({ url });
}

/**
 * Önizleme adresi — indirme başlığı OLMADAN.
 *
 * Ayrı bir fonksiyon çünkü `download` parametresi tarayıcıya "bunu göster
 * değil, kaydet" diyor; PDF'i sekmede açmak isteyen kullanıcı için tersi
 * gerekiyor.
 */
export async function getDocumentPreviewUrl(
  id: string,
): Promise<ActionResult<{ url: string; mimeType: string }>> {
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("file_url, mime_type")
    .eq("id", id)
    .maybeSingle();

  if (error) return fail(toMessage(error));
  if (!document) return fail("Belge bulunamadı ya da erişim yetkiniz yok.");

  const url = await signedUrlFor(document.file_url);
  if (!url) return fail("Önizleme bağlantısı üretilemedi.");

  return ok({ url, mimeType: document.mime_type });
}
