/**
 * ============================================================================
 * HERKESE AÇIK DEMO HESABI
 * ============================================================================
 * Giriş ekranındaki "Demo hesabıyla gör" düğmesi bu iki değeri forma yazıyor.
 *
 * -----------------------------------------------------------------------------
 * ŞİFRE NEDEN KAYNAK KODDA
 * -----------------------------------------------------------------------------
 * Çünkü özelliğin kendisi bu: düğmenin işi alanları doldurmak ve tarayıcıya
 * inen bir kodun yazacağı değer gizli olamaz. Bunu "sızıntı" değil "yayın"
 * yapan şey, hesabın ne olduğudur:
 *
 *   · `demo` rolünün veritabanında HİÇBİR yazma politikası yok
 *     (`0013_demo_role.sql`) — INSERT/UPDATE/DELETE varsayılan olarak reddedilir.
 *   · Server action'lar da ayrıca durduruyor (`lib/actions/guard.ts`), yani
 *     servis anahtarıyla çalışan davet/şifre akışları bile kapalı.
 *   · Hesabın kendine ait tek bir ilanı, müşterisi ya da satışı yok; gördüğü
 *     her satır seed verisi.
 *
 * Yani ele geçirilecek bir şey yok — bilerek herkese açık.
 *
 * BU DOSYA BİR İSTİSNA. Projedeki başka hiçbir kimlik bilgisi kaynak koda
 * yazılmaz; gerçek anahtarlar `.env.local` içinde ve `.gitignore`'da.
 *
 * Şifre Supabase Dashboard > Authentication > Users altından ELLE kuruluyor
 * (0013'ün başındaki not). Orada değiştirilirse buradaki de değişmeli.
 */
export const DEMO_EMAIL = "demo@estateflow.app";
export const DEMO_PASSWORD = "EstateFlowDemo2026!";
