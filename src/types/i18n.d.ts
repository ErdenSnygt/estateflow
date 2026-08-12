import type { Locale } from "@/i18n/config";
import type messages from "../../messages/tr.json";

/**
 * ============================================================================
 * ÇEVİRİ ANAHTARLARININ TİP GÜVENLİĞİ
 * ============================================================================
 * next-intl'e sözlüğün ŞEKLİNİ bildiriyor. Kazancı somut: `t("navbar.themeTrigger")`
 * yazımı denetleniyor, `t("navbar.themeTriger")` DERLEME ZAMANINDA hata veriyor.
 *
 * Bu olmasaydı yanlış yazılmış bir anahtar sessizce anahtarın kendisini
 * ekrana basardı — arayüzde "navbar.themeTriger" yazan bir düğme. Projedeki
 * şema generic'iyle (`types/supabase.ts`) aynı gerekçe: hatayı çalışma
 * zamanından derleme zamanına çekmek.
 *
 * REFERANS DİL TÜRKÇE (`tr.json`): kaynak metinler Türkçe yazılıyor, İngilizce
 * onun çevirisi. Bu yüzden `en.json` bir anahtarı kaçırırsa tip hatası
 * ÇIKMIYOR — çıkması için ayrı bir denetim gerekiyor ve o denetim testte
 * (`src/i18n/messages.test.ts`), çünkü orada iki dosyayı karşılaştırmak
 * mümkün.
 */
declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
    Locale: Locale;
  }
}
