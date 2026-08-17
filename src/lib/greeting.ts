/**
 * ============================================================================
 * SELAMLAMA DÖNEMİ — SAF, SENKRON, METİNSİZ
 * ============================================================================
 * Dashboard başlığı günün saatine göre değişiyor. Bu dosya yalnızca "hangi
 * dönemdeyiz" sorusunu yanıtlıyor; metni `dashboard.greeting.*` altındaki
 * sözlük veriyor.
 *
 * Faz 25'te yerleşen desenin aynısı: SAF KATMAN ANAHTAR TAŞIR, cümleyi çağıran
 * kurar. Buraya "Günaydın" yazsaydık İngilizce arayüzde Türkçe bir başlık
 * çıkardı.
 *
 * SINIRLAR NEDEN BÖYLE:
 *  · 05:00 sabahın başlangıcı — emlak ofisinde gün erken açılıyor.
 *  · 11:00'de "günaydın" demek geç kalmış olur, öğleye bir saat var.
 *  · 18:00 mesai sonu; akşam orada başlıyor.
 *  · 22:00'den sonra "iyi geceler" — o saatte açık olan ekran ya nöbet ya
 *    da unutulmuş bir sekme.
 *
 * Aralıklar KAPALI-AÇIK (`[from, to)`): 11:00 tam olarak `afternoon`. Bir
 * saatin iki döneme birden düşmesi imkânsız.
 */

/** Sözlükteki `dashboard.greeting.*` anahtarlarıyla birebir aynı. */
export const GREETING_PERIODS = [
  "morning",
  "afternoon",
  "evening",
  "night",
] as const;

export type GreetingPeriod = (typeof GREETING_PERIODS)[number];

/**
 * Saatten (0–23) döneme.
 *
 * `night` iki parçalı ve GECE YARISINI AŞIYOR (22:00–05:00). Bu yüzden
 * diğerlerinin aksine tek bir `from <= hour < to` karşılaştırmasıyla
 * anlatılamıyor; sıralı denetimin sonunda kalan aralık olarak duruyor.
 */
export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}
