"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * ============================================================================
 * TARAYICI İSTEMCİSİ
 * ============================================================================
 * Yalnızca istemci bileşenlerinde kullanılır: giriş/çıkış ve OAuth yönlendirme.
 * Veri okuma sunucuda yapılır (`lib/data/*`), burada değil.
 *
 * `createBrowserClient` oturumu çereze yazar — `localStorage` yerine çerez,
 * çünkü sunucu bileşenleri ve middleware oturumu ancak çerezden okuyabilir.
 * Aynı sekmede tekrar tekrar çağrılsa da @supabase/ssr tek örnek döndürür.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
