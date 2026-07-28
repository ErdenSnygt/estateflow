import type { PostgrestError } from "@supabase/supabase-js";

/**
 * ============================================================================
 * SORGU SONUCU AÇICILARI
 * ============================================================================
 * PostgREST her yanıtta `{ data, error }` döner ve `error` sessizce yok
 * sayılırsa hata "boş liste" gibi görünür — dashboard sıfırlanır, kimse
 * nedenini anlamaz. Bu yardımcılar hatayı istisnaya çevirir: bağlam (hangi
 * sorgu) mesaja yazılır, Next hata sınırı da görünür bir sayfa basar.
 *
 * FAZ 6'DA DEĞİŞEN: istemcilere şema generic'i verildi (`types/supabase.ts`),
 * yani sorgular artık satır tipini kendileri biliyor. Önceki sürüm sonucu
 * `unknown[]` alıp çağıranın bildirdiği tipe DÖNÜŞTÜRÜYORDU — `rows<Listing>`
 * yazılan yerde gerçekten `listings` sorgulanıp sorgulanmadığını hiçbir şey
 * denetlemiyordu. Artık `T` sonuçtan çıkarılıyor; açıkça yazılan tip yalnızca
 * bir DOĞRULAMA, dönüşüm değil.
 */

type Result<T> = { data: T | null; error: PostgrestError | null };

/** Liste sorguları — hata istisna, veri yoksa boş dizi. */
export function rows<T>(result: Result<T[]>, context: string): T[] {
  if (result.error) {
    throw new Error(`${context} sorgusu başarısız: ${result.error.message}`);
  }
  return result.data ?? [];
}

/** `maybeSingle()` sorguları — kayıt bulunamaması hata değildir. */
export function maybeRow<T>(result: Result<T>, context: string): T | null {
  if (result.error) {
    throw new Error(`${context} sorgusu başarısız: ${result.error.message}`);
  }
  return result.data ?? null;
}

/** `head: true` sayım sorguları. */
export function counted(
  result: { count: number | null; error: PostgrestError | null },
  context: string,
): number {
  if (result.error) {
    throw new Error(`${context} sayımı başarısız: ${result.error.message}`);
  }
  return result.count ?? 0;
}

/**
 * PostgREST'in `or()` filtresi virgülü ayraç, parantezi gruplama işareti
 * olarak okur; kullanıcının yazdığı metin doğrudan geçirilirse sorgu bozulur
 * (ve 400 döner). Arama kutusuna "Kadıköy, 3+1" yazmak bir hata sayfası
 * üretmemeli — bu karakterler sessizce düşürülür.
 */
export function sanitizeSearch(value: string): string {
  return value.replace(/[,()\\]/g, " ").trim();
}
