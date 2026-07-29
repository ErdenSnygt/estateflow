"use client";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { UploadError, type UploadProgress } from "@/lib/storage/upload";
import {
  ACCEPTED_DOCUMENT_TYPES,
  DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_BYTES,
  PRIVATE_BUCKET,
  formatBytes,
} from "@/lib/storage/paths";

/**
 * ============================================================================
 * BELGE YÜKLEME (private bucket)
 * ============================================================================
 * `upload.ts` ile aynı gerekçelerle tarayıcıdan ve XHR ile — 1 MB'lık server
 * action gövde sınırı, çift veri taşıma ve gerçek ilerleme göstergesi. O
 * dosyanın başlığındaki uzun açıklama burada da geçerli.
 *
 * ÜÇ FARK VAR:
 *
 *  1. SIKIŞTIRMA YOK. `upload.ts` görselleri 2000 piksele indirip WebP'ye
 *     çeviriyor; bir tapu taramasında bu KAYIP demek — okunması gereken ince
 *     yazılar bozulur, PDF ise zaten canvas'tan geçirilemez. Belge olduğu gibi
 *     gidiyor, sınır da bu yüzden 20 MB.
 *
 *  2. DÖNEN DEĞER URL DEĞİL, NESNE YOLU. Private bucket'ta kalıcı adres yok;
 *     `documents.file_url` kolonu bu yolu taşıyor ve indirme anında
 *     `lib/storage/signed.ts` imzalıyor.
 *
 *  3. `cache-control` KISA. Public görsellerde bir yıl veriliyordu (uuid yolu,
 *     içerik hiç değişmez). Burada da içerik değişmiyor ama imzalı URL'ler
 *     ara katmanlarda önbelleğe alınmasın diye kısa tutuldu.
 */

function validate(file: File) {
  if (
    !ACCEPTED_DOCUMENT_TYPES.includes(
      file.type as (typeof ACCEPTED_DOCUMENT_TYPES)[number],
    )
  ) {
    throw new UploadError(
      `"${file.name}" desteklenmeyen bir biçimde. PDF, Word veya görsel yükleyin.`,
    );
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new UploadError(
      `"${file.name}" çok büyük (${formatBytes(file.size)}). En fazla ${formatBytes(MAX_DOCUMENT_BYTES)} yükleyebilirsiniz.`,
    );
  }

  if (file.size === 0) {
    throw new UploadError(`"${file.name}" boş görünüyor.`);
  }
}

export type UploadedDocument = {
  /** `documents.file_url` kolonuna yazılacak nesne yolu. */
  path: string;
  size: number;
  mimeType: string;
};

export async function uploadDocument(
  file: File,
  onProgress?: UploadProgress,
): Promise<UploadedDocument> {
  validate(file);

  /* Gerekçe `upload.ts` içinde: istemci ancak dosya seçildiğinde gerekiyor,
     statik import onu sayfa açılışına taşıyordu. */
  const { createClient } = await import("@/lib/supabase/client");

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new UploadError(
      "Oturumunuz sonlanmış. Sayfayı yenileyip tekrar deneyin.",
    );
  }

  const extension = DOCUMENT_EXTENSIONS[file.type] ?? "bin";
  const path = `${crypto.randomUUID()}.${extension}`;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `${SUPABASE_URL}/storage/v1/object/${PRIVATE_BUCKET}/${path}`,
      true,
    );
    request.setRequestHeader("authorization", `Bearer ${session.access_token}`);
    request.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("cache-control", "max-age=60");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }

      let message = `Yükleme başarısız (HTTP ${request.status}).`;
      try {
        const body = JSON.parse(request.responseText) as { message?: string };
        if (/exceeded the maximum allowed size/i.test(body.message ?? "")) {
          message = `"${file.name}" sunucu sınırını aştı (en fazla ${formatBytes(MAX_DOCUMENT_BYTES)}).`;
        } else if (/mime type/i.test(body.message ?? "")) {
          message = `"${file.name}" desteklenmeyen bir biçimde.`;
        } else if (request.status === 403) {
          message = "Bu dosyayı yükleme yetkiniz yok.";
        } else if (body.message) {
          message = body.message;
        }
      } catch {
        // Gövde JSON değilse genel mesaj kalır.
      }
      reject(new UploadError(message));
    };

    request.onerror = () =>
      reject(new UploadError("Bağlantı hatası — yükleme tamamlanamadı."));
    request.onabort = () => reject(new UploadError("Yükleme iptal edildi."));

    request.send(file);
  });

  return { path, size: file.size, mimeType: file.type };
}
