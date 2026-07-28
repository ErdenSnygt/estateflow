import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * ============================================================================
 * ⚠️  SERVİS ANAHTARI İSTEMCİSİ — RLS'İ TAMAMEN ATLAR
 * ============================================================================
 * Bu dosya Faz 10'da açıldı ve projedeki en tehlikeli dosya. `SUPABASE_SECRET_KEY`
 * her politikayı, her `with check`i, her rol kontrolünü atlar. Faz 5'ten Faz 9'a
 * kadar bu anahtar YALNIZCA seed script'indeydi; artık uygulama çalışma
 * zamanında da var çünkü kullanıcı oluşturmak (Auth Admin API) başka türlü
 * mümkün değil.
 *
 * -----------------------------------------------------------------------------
 * ÜÇ KATMANLI KORUMA
 * -----------------------------------------------------------------------------
 *  1. `import "server-only"` — bu modül bir istemci bileşeninden import
 *     edilirse DERLEME HATASI verir. Çalışma zamanına kadar beklenmez.
 *  2. Anahtar `NEXT_PUBLIC_` öneki taşımıyor, yani Next onu istemci paketine
 *     hiçbir koşulda gömmez.
 *  3. Tek çağıran `lib/auth/admin-actions.ts` ve oradaki her fonksiyon ilk
 *     satırında yönetici kontrolü yapıyor.
 *
 * -----------------------------------------------------------------------------
 * KULLANIM KURALI
 * -----------------------------------------------------------------------------
 * Bu istemciyle YALNIZCA şunlar yapılır:
 *   · Auth Admin API çağrıları (kullanıcı oluşturma/silme)
 *   · denetim kaydı yazma (kullanıcının değiştiremeyeceği kayıtlar)
 *
 * Sıradan okuma/yazma işleri normal sunucu istemcisiyle (`supabase/server.ts`)
 * yapılır — orada RLS geçerli ve o bir güvenlik ağı. Bu dosyayı kolaylık için
 * kullanmak, projedeki tüm yetkilendirmeyi devre dışı bırakmak demektir.
 */

/**
 * `SUPABASE_SECRET_KEY` modül yüklenirken DEĞİL, çağrı anında okunuyor.
 *
 * Sebep: anahtar tanımsızsa hata, uygulamanın açılışında değil yalnızca bir
 * yönetici davet düğmesine bastığında çıksın ve ne yapılması gerektiğini
 * söylesin. Modül seviyesinde okunsaydı anahtar olmayan bir kurulumda
 * `/personeller` sayfası tamamen çökerdi.
 */
export function createAdminClient() {
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "SUPABASE_SECRET_KEY tanımlı değil. Personel davet etmek Supabase Auth " +
        "Admin API'sini gerektiriyor; anahtarı Supabase Dashboard > Project " +
        "Settings > API Keys altından alıp .env.local dosyasına ekleyin " +
        "(NEXT_PUBLIC_ öneki OLMADAN).",
    );
  }

  return createSupabaseClient<Database>(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
