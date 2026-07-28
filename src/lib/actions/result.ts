/**
 * ============================================================================
 * SERVER ACTION SONUÇ SÖZLEŞMESİ
 * ============================================================================
 * Action'lar `redirect()` ÇAĞIRMAZ, sonuç nesnesi döner. İki gerekçe:
 *
 *  1. Sonner bildirimi gerçek sonucu yansıtmalı. `redirect()` bir istisna
 *     fırlatır ve action orada biter — istemci "başarılı" mı "hatalı" mı
 *     olduğunu öğrenemez, formu her durumda iyimser bir mesajla kapatırdı.
 *  2. Hata mesajı kullanıcıya gösterilebilir. Fırlatılan istisna üretimde
 *     "An error occurred in the Server Components render" ile maskelenir.
 *
 * Yönlendirmeyi istemci yapar; hangi sayfaya gidileceği zaten orada belli.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = (error: string): ActionResult<never> => ({
  ok: false,
  error,
});

/**
 * Postgres hata kodlarını kullanıcıya gösterilebilir Türkçe mesaja çevirir.
 * Tanımadığımız kodlarda ham mesajı geçiyoruz — sessizce "bir hata oluştu"
 * demek hata ayıklamayı imkânsızlaştırıyor.
 */
export function toMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "23505":
      return "Bu kayıt zaten mevcut (benzersiz alan çakışması).";
    case "23503":
      return "İlişkili kayıt bulunamadı; seçilen danışman silinmiş olabilir.";
    case "23514":
      return "Girilen değerler veritabanı kurallarına uymuyor.";
    case "42501":
      return "Bu işlem için yetkiniz yok. Oturumunuz düşmüş olabilir.";
    default:
      return error.message;
  }
}
