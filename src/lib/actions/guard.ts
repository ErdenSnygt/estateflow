import { fail, type ActionResult } from "@/lib/actions/result";
import { isReadOnlySession } from "@/lib/auth/server";

/**
 * ============================================================================
 * SALT OKUNUR HESAP MUHAFIZI — İKİNCİ KATMAN
 * ============================================================================
 * Demo hesabının yazma denemesini VERİTABANI zaten reddediyor: `demo` rolü
 * için hiçbir INSERT/UPDATE/DELETE politikası yok ve RLS'in varsayılanı
 * reddetmek (`0013_demo_role.sql`). Bu dosya güvenlik eklemiyor — MESAJ
 * ekliyor.
 *
 * Muhafız olmasaydı ne olurdu: Postgres `42501` (insufficient privilege)
 * döndürür, `toMessage()` onu `forbidden` anahtarına çevirir ve kullanıcı
 * "Bu işlem için yetkiniz yok" görürdü. Doğru ama eksik bir cümle — ziyaretçi
 * hesabının bozuk olduğunu sanır. Doğru cümle "bu bir demo hesabı".
 *
 * Bazı action'larda ise RLS'e hiç varılmıyordu: `changePassword` Supabase
 * Auth'a gidiyor, `inviteAgent` servis anahtarıyla çalışıyor ve SERVİS ANAHTARI
 * RLS'İ ATLAR. Yani o iki yerde muhafız güvenliğin KENDİSİ, süsü değil.
 *
 * -----------------------------------------------------------------------------
 * NEREYE KONULUR
 * -----------------------------------------------------------------------------
 * Her yazma action'ının İLK satırına, doğrulamadan da önce:
 *
 *     const denied = await denyIfReadOnly();
 *     if (denied) return denied;
 *
 * Doğrulamadan önce olması bilinçli: demo kullanıcının önce "başlık en az 3
 * karakter olmalı" uyarısını, sonra "yazamazsınız"ı görmesi anlamsız.
 *
 * OKUMA ACTION'LARINA KONULMAZ. `getDocumentDownloadUrl` ve
 * `getDocumentPreviewUrl` isimleri gereği action ama yaptıkları iş imzalı bir
 * adres üretmek — demo evrakı açabilmeli.
 */
export async function denyIfReadOnly(): Promise<ActionResult<never> | null> {
  return (await isReadOnlySession()) ? fail("demoReadOnly") : null;
}
