import { cache } from "react";

import type { CompanySettings } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

/**
 * Şirket ayarları — TEK SATIR (`id = 'default'`).
 *
 * Satır migration'da açılıyor ve silinemiyor (DELETE politikası yok), yani
 * normalde her zaman var. Yine de `null` dönebilir: migration çalıştırılmadan
 * önce ya da RLS okumayı reddederse. Hata FIRLATILMIYOR — bu veri
 * `/ayarlar` sayfasının bir bölümü, sayfanın tamamını hata ekranına
 * düşürmemeli (`data/notifications.ts` ile aynı gerekçe).
 *
 * `cache()` istek başına: sayfa hem formu doldurmak hem başlığı yazmak için
 * aynı satırı isteyebiliyor.
 */
export const getCompanySettings = cache(
  async function getCompanySettings(): Promise<CompanySettings | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.error(`[company] ayarlar okunamadı: ${error.message}`);
      return null;
    }

    return data ?? null;
  },
);
