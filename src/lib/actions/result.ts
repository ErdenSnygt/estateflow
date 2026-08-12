import { getTranslations } from "next-intl/server";

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
 *
 * -----------------------------------------------------------------------------
 * FAZ 22: HATA METİNLERİ DE ÇEVRİLİYOR
 * -----------------------------------------------------------------------------
 * Faz 19–21 arayüzü iki dile çıkardı ama `result.error` her yerde Türkçe
 * kaldı: İngilizce bir formda doğru etiketler, altında Türkçe bir hata
 * bildirimi. Sebep yapısaldı — `fail()` hazır metin alıyordu ve action'lar o
 * metni kaynak kodda taşıyordu.
 *
 * ÇÖZÜM: `fail()` artık METİN DEĞİL ANAHTAR alıyor ve çeviriyi kendisi
 * çözüyor. Server action bir istek bağlamında çalıştığı için
 * `getTranslations()` orada da geçerli; dil çerezi zaten okunuyor
 * (`i18n/request.ts`).
 *
 * `fail` ASENKRON OLDU ama çağrı yerleri değişmedi: hepsi `return fail(...)`
 * biçiminde ve `async` bir fonksiyondan promise döndürmek onu otomatik
 * çözüyor. Tek gerçek değişiklik argümanın metinden anahtara dönmesi.
 *
 * KATALOG TİPLİ. Yeni bir action yanlış anahtar yazarsa derleme kırılıyor;
 * `messages.test.ts` de tersini denetliyor (birlikte olup sözlükte olmayan).
 * Bundan sonraki modüller bu yüzden eski desene dönemiyor — `fail("Türkçe
 * metin")` artık tip hatası.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

/** `messages.errors.actions` altındaki anahtarlar. */
export type ActionErrorKey =
  | "agentNotFound"
  | "accountInactive"
  | "noPermission"
  | "managerRequired"
  | "sessionNotLinked"
  | "duplicate"
  | "missingRelation"
  | "checkViolation"
  | "forbidden"
  | "listingNotFound"
  | "listingDeletedMeanwhile"
  | "customerNotFound"
  | "appointmentCustomerRequired"
  | "appointmentNotFound"
  | "appointmentStatusChanged"
  | "appointmentTimelineFailed"
  | "appointmentDateUnreadable"
  | "appointmentEndBeforeStart"
  | "appointmentAgentNotFound"
  | "appointmentOtherAgent"
  | "appointmentAlreadyInStatus"
  | "appointmentTransitionNotAllowed"
  | "offerAmountPositive"
  | "offerListingSold"
  | "offerPendingExists"
  | "offerPendingRace"
  | "offerNotFound"
  | "offerStatusChanged"
  | "offerSaleFailed"
  | "offerAlreadyInStatus"
  | "offerTerminal"
  | "documentTitleRequired"
  | "documentUploadFailed"
  | "documentAgentNotFound"
  | "documentNotFound"
  | "documentNotFoundOrForbidden"
  | "documentDownloadLinkFailed"
  | "documentPreviewLinkFailed"
  | "noteNotFoundOrForbidden"
  | "noteAlreadyResolved"
  | "noteNoStatus"
  | "noteEmpty"
  | "noteAttachmentTypeUnknown"
  | "noteAgentNotFound"
  | "noteParentNotFound"
  | "noteReplyToReply"
  | "noteContextRequired"
  | "noteTargetNotFound"
  | "noteTargetInactive"
  | "noteHandoffCustomerForbidden"
  | "noteHandoffListingForbidden"
  | "saleNotFound"
  | "commissionManagerRequired"
  | "commissionStatusChanged"
  | "commissionAlreadyInStatus"
  | "commissionTransitionNotAllowed"
  | "profileNameMin2"
  | "passwordMin8"
  | "passwordSameAsOld"
  | "sessionUnreadable"
  | "passwordWrong"
  | "companyManagerRequired"
  | "companyNameRequired"
  | "emailInvalid"
  | "nameMin3"
  | "commissionRateRange"
  | "patronRoleOnlyByPatron"
  | "agentEmailExists"
  | "staffNotFound"
  | "cannotEditOwnRole"
  | "patronChangesOnlyByPatron"
  | "cannotDeactivateSelf"
  | "patronDeactivateOnlyByPatron"
  | "lastPatron"
  | "staffAlreadyActive"
  | "staffAlreadyInactive"
  | "authAccountExists"
  | "authAccountFailed";

/**
 * Çevrilmeyecek dış metin.
 *
 * Supabase ve OAuth sağlayıcısı kendi diliyle konuşuyor; onlara ait bir
 * cümleyi sözlüğe kopyalamak olmayan bir çeviriyi uydurmak olurdu. Sarmalayıcı
 * bir tip, "bu bilinçli" demenin yolu: düz `string` kabul etseydik anahtar
 * yazmayı unutmak sessizce geçerdi.
 */
export type RawActionError = { raw: string };

export const raw = (message: string): RawActionError => ({ raw: message });

export type ActionErrorSource = ActionErrorKey | RawActionError;

type ErrorValues = Record<string, string | number>;

/** Anahtarı (ya da ham metni) aktif dilde bir cümleye çevirir. */
export async function resolveActionError(
  source: ActionErrorSource,
  values?: ErrorValues,
): Promise<string> {
  if (typeof source !== "string") return source.raw;
  const t = await getTranslations("errors.actions");
  return t(source, values);
}

/**
 * Başarısız sonuç.
 *
 * `return fail("listingNotFound")` — anahtar, gerekiyorsa değişkenlerle.
 * Dış kaynaklı metin için `fail(raw(error.message))`.
 */
export async function fail(
  source: ActionErrorSource,
  values?: ErrorValues,
): Promise<ActionResult<never>> {
  return { ok: false, error: await resolveActionError(source, values) };
}

/**
 * Postgres hata kodlarını katalog anahtarına çevirir.
 *
 * Tanımadığımız kodlarda HAM MESAJ geçiyor — sessizce "bir hata oluştu" demek
 * hata ayıklamayı imkânsızlaştırıyor. Dönen değer `fail`e doğrudan verilebilir.
 */
export function toMessage(error: {
  code?: string;
  message: string;
}): ActionErrorSource {
  switch (error.code) {
    case "23505":
      return "duplicate";
    case "23503":
      return "missingRelation";
    case "23514":
      return "checkViolation";
    case "42501":
      return "forbidden";
    default:
      return raw(error.message);
  }
}
