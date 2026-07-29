"use client";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
  publicUrlFor,
  type PublicBucket,
} from "@/lib/storage/paths";

/**
 * ============================================================================
 * GÖRSEL YÜKLEME
 * ============================================================================
 * Üç yükleme noktasının (ilan galerisi, müşteri portresi, personel portresi)
 * tamamı bu dosyadan geçer.
 *
 * -----------------------------------------------------------------------------
 * NEDEN TARAYICIDAN, SERVER ACTION ÜZERİNDEN DEĞİL
 * -----------------------------------------------------------------------------
 * Projenin geri kalanında yazma işlemleri server action'lardan geçiyor; burada
 * bilinçli bir istisna var:
 *
 *  1. Server action gövdesi varsayılan olarak 1 MB ile sınırlı. 8 MB'lık bir
 *     fotoğraf için bu sınırın yükseltilmesi gerekirdi.
 *  2. Dosya Next sunucusuna gidip oradan Storage'a çıkardı — aynı baytlar iki
 *     kez taşınır, sunucu belleği boşuna meşgul edilir.
 *  3. Gerçek ilerleme göstergesi ancak tarayıcı isteğinde mümkün.
 *
 * Yetkilendirme kaybı yok: yükleme kullanıcının oturum jetonuyla yapılıyor ve
 * `storage.objects` politikaları (`0003_storage.sql`) aynen geçerli.
 *
 * -----------------------------------------------------------------------------
 * NEDEN XHR, `supabase.storage.upload()` DEĞİL
 * -----------------------------------------------------------------------------
 * `@supabase/storage-js` fetch üzerine kurulu ve yükleme ilerlemesi bildirmiyor
 * — fetch'in böyle bir olayı yok. Gerçek bayt ilerlemesi için tek yol
 * `XMLHttpRequest.upload.onprogress`. Sahte bir animasyon göstermektense
 * gerçeğini vermek, 8 MB'lık bir dosyada telefon bağlantısıyla fark yaratıyor.
 */

/** 0 → 1 arası oran. */
export type UploadProgress = (ratio: number) => void;

export class UploadError extends Error {}

/* ==========================================================================
   Sıkıştırma
   ========================================================================== */

/** Uzun kenar bu değeri aşarsa küçültülür. İlan galerisi için fazlasıyla yeterli. */
const MAX_EDGE = 2000;
const WEBP_QUALITY = 0.82;

/**
 * Görseli tarayıcıda küçültüp WebP'ye çevirir.
 *
 * Telefon fotoğrafları 5-12 MB ve 4000+ piksel geliyor; ekranda en fazla
 * 1200 piksel gösteriliyor. Sıkıştırma tipik olarak 6 MB'ı 250-400 KB'a
 * indiriyor — yükleme süresi ve depolama maliyeti onda bire düşüyor.
 *
 * BAŞARISIZ OLURSA ORİJİNAL DÖNER. Sıkıştırma bir iyileştirme, bir kapı değil:
 * `createImageBitmap` desteklenmiyorsa ya da sonuç beklenmedik şekilde daha
 * büyük çıkarsa (küçük PNG'lerde olabiliyor) dosya olduğu gibi yüklenir.
 */
async function compress(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
    });

    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch {
    return file;
  }
}

/* ==========================================================================
   Yükleme
   ========================================================================== */

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function validate(file: File) {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    throw new UploadError(
      `"${file.name}" desteklenmeyen bir biçimde. JPG, PNG veya WebP yükleyin.`,
    );
  }

  /* Sıkıştırma ÖNCESİ sınır bilinçli olarak yüksek: 8 MB'lık asıl sınır
     sıkıştırılmış dosya için geçerli, ama 100 MB'lık bir dosyayı tarayıcıda
     çözmeye çalışmak sekmeyi kilitler. */
  if (file.size > MAX_UPLOAD_BYTES * 5) {
    throw new UploadError(
      `"${file.name}" çok büyük (${formatBytes(file.size)}). En fazla ${formatBytes(MAX_UPLOAD_BYTES)} yükleyebilirsiniz.`,
    );
  }
}

/**
 * Dosyayı yükler ve kalıcı public URL'ini döner.
 *
 * Hata durumunda `UploadError` fırlatır — mesajı doğrudan kullanıcıya
 * gösterilebilir.
 */
/**
 * Yalnızca PUBLIC bucket'lar: bu fonksiyon görselleri sıkıştırıp kalıcı bir
 * public URL dönüyor. Private `documents` bucket'ı için
 * `lib/storage/upload-document.ts` var — orada sıkıştırma yok ve dönen değer
 * URL değil, nesne yolu.
 */
export async function uploadImage(
  file: File,
  bucket: PublicBucket,
  onProgress?: UploadProgress,
): Promise<string> {
  validate(file);

  /* SUPABASE İSTEMCİSİ GEÇ YÜKLENİYOR (dinamik import).
     Bu modülden tek ihtiyacımız oturum jetonu, ama `@supabase/supabase-js`
     tek parça olarak ~184 KB ve statik import edildiğinde form sayfası
     AÇILIRKEN indiriliyordu — kullanıcı hiç fotoğraf seçmese bile.
     Dinamik import onu dosya seçildiği ana erteliyor; o an kullanıcı zaten
     bir yükleme bekliyor, ek gecikme fark edilmiyor. */
  const { createClient } = await import("@/lib/supabase/client");

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new UploadError("Oturumunuz sonlanmış. Sayfayı yenileyip tekrar deneyin.");
  }

  const blob = await compress(file);
  const type = blob.type || file.type;

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `"${file.name}" sıkıştırıldıktan sonra bile ${formatBytes(blob.size)} — sınır ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    );
  }

  const path = `${crypto.randomUUID()}.${EXTENSIONS[type] ?? "jpg"}`;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
      true,
    );
    request.setRequestHeader("authorization", `Bearer ${session.access_token}`);
    request.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    request.setRequestHeader("content-type", type);
    /* Dosya adı benzersiz (uuid), yani içerik hiç değişmiyor — bir yıl
       önbelleğe alınabilir. */
    request.setRequestHeader("cache-control", "max-age=31536000");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }

      /* Storage hatayı JSON olarak döner; en sık karşılaşılan ikisi bucket
         sınırlarından geliyor ve kullanıcıya ham İngilizce mesaj göstermek
         yerine ne olduğunu söylüyoruz. */
      let message = `Yükleme başarısız (HTTP ${request.status}).`;
      try {
        const body = JSON.parse(request.responseText) as { message?: string };
        if (/exceeded the maximum allowed size/i.test(body.message ?? "")) {
          message = `"${file.name}" sunucu sınırını aştı (en fazla ${formatBytes(MAX_UPLOAD_BYTES)}).`;
        } else if (/mime type/i.test(body.message ?? "")) {
          message = `"${file.name}" desteklenmeyen bir biçimde. JPG, PNG veya WebP yükleyin.`;
        } else if (request.status === 403) {
          message = "Bu dosyayı yükleme yetkiniz yok.";
        } else if (body.message) {
          message = body.message;
        }
      } catch {
        // Gövde JSON değilse yukarıdaki genel mesaj kalır.
      }
      reject(new UploadError(message));
    };

    request.onerror = () =>
      reject(new UploadError("Bağlantı hatası — yükleme tamamlanamadı."));
    request.onabort = () => reject(new UploadError("Yükleme iptal edildi."));

    request.send(blob);
  });

  return publicUrlFor(bucket, path);
}
