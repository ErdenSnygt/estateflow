import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * ============================================================================
 * SUNUCU İSTEMCİSİ
 * ============================================================================
 * Sunucu bileşenleri, server action'lar ve route handler'lar için. Her istekte
 * YENİDEN oluşturulur — modül seviyesinde tek bir örnek tutulamaz, çünkü
 * istemci isteğin çerezlerine (yani kullanıcının oturumuna) bağlıdır ve
 * paylaşılan bir örnek bir kullanıcının oturumunu diğerine sızdırır.
 *
 * `next/headers` içeri alındığı için bu dosya edge middleware'den import
 * EDİLEMEZ; oradaki karşılığı `lib/auth/session.ts` içinde durur.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        /* Sunucu bileşenleri çerez yazamaz. Oturum tazeleme zaten
           middleware'de yapılıyor, bu yüzden hata yutulabilir; server
           action ve route handler'larda ise yazma başarılı olur. */
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Sunucu bileşeni bağlamı — yok sayılır.
        }
      },
    },
  });
}
