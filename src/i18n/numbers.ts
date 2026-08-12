import type { Formatter } from "@/i18n/dates";

/**
 * ============================================================================
 * DİL BİLEN YÜZDE BİÇİMLENDİRME
 * ============================================================================
 * `i18n/dates.ts` tarih için ne yapıyorsa bu dosya oran için onu yapıyor.
 *
 * -----------------------------------------------------------------------------
 * NEDEN AYRI BİR KATMAN — `format.number()` ZATEN VAR
 * -----------------------------------------------------------------------------
 * İki şeyi tekrar ettirmemek için:
 *
 *  · GİRDİ SÖZLEŞMESİ. `Intl`in yüzde biçimi ORAN bekliyor (0.02 → %2). Veri
 *    katmanında bazı alanlar zaten oran (`agents.commission_rate`), bazıları
 *    yüzde tamsayısı. Dönüşümü on bir çağrı yerinde tekrarlamak, birinin
 *    yüzü unutup "%200" göstermesi demekti.
 *  · BİÇİM ADI. `"rate"` / `"percent"` adları `i18n/request.ts` içinde
 *    tanımlı; burada tip düzeyinde daraltılıyor ki yanlış ad derlemede
 *    yakalansın.
 *
 * -----------------------------------------------------------------------------
 * YÜZDE İŞARETİNİ SÖZLÜK DEĞİL `Intl` KOYUYOR
 * -----------------------------------------------------------------------------
 * Faz 20–24 boyunca işaretin yeri çeviri metninde tutuluyordu: Türkçe
 * `"%{rate}"`, İngilizce `"{rate}%"`. Çalışıyordu ama aynı bilgiyi iki dilde
 * elle tekrar etmek demekti ve `Intl` bunu zaten biliyor — üstelik bazı
 * dillerde araya bölünemez boşluk da koyuyor. Faz 25'te işaret sözlükten
 * kalktı; anahtarlarda artık yalnızca `{rate}` var.
 */

/**
 * %2,0 · 2.0% — prim ve komisyon oranı.
 *
 * ONDALIK BASAMAK SABİT (bir hane): prim oranları binde beşlik adımlarla
 * konuşuluyor ("iki nokta beş") ve "%2" ile "%2,5" arasındaki fark hakediş
 * demek. Basamağı `maximumFractionDigits`e bırakmak %2,0'ı "%2" yapardı.
 */
export function formatRate(format: Formatter, ratio: number) {
  return format.number(ratio, "rate");
}

/**
 * %42 · 42% — ilerleme çubukları ve dağılım payları.
 *
 * Girdi ORAN. Elinde tamsayı yüzde varsa yüze bölerek çağır; ikinci bir
 * "tamsayı alan" sürüm açmadım çünkü iki imza, çağrı yerinde hangisinin
 * hangisi olduğunu düşündürürdü.
 */
export function formatPercent(format: Formatter, ratio: number) {
  return format.number(ratio, "percent");
}

/**
 * +%12,4 · +12.4% — önceki döneme göre değişim (KPI kartı).
 *
 * `formatPercent`ten üç farkı var ve üçü de bu kullanıma özgü: bir ondalık
 * basamağa kadar (küçük değişimler kaybolmasın), ARTI işareti dahil ve
 * sıfırda işaretsiz. İşareti `Intl` koyuyor — kart onu elle ekliyordu ve
 * eksi değerde çift işaret riski taşıyordu.
 */
export function formatDelta(format: Formatter, ratio: number) {
  return format.number(ratio, "delta");
}

/** 1 MB — altında kilobayta düşülüyor. */
const BYTES_PER_MB = 1024 * 1024;

/**
 * 8,0 MB · 8.0 MB — dosya boyutu.
 *
 * -----------------------------------------------------------------------------
 * NEDEN BURADA, `lib/storage/paths.ts`TE DEĞİL
 * -----------------------------------------------------------------------------
 * Faz 25'e kadar oradaydı ve şöyle bir satır içeriyordu:
 *
 *     `${mb.toFixed(1).replace(".", ",")} MB`
 *
 * `toFixed` her zaman nokta veriyor; virgül elle konuyordu. Yani dosya boyutu
 * her dilde Türkçe yazılıyordu — İngilizce arayüzde "8,0 MB". Yüzdeyle
 * BİREBİR aynı hata ve aynı gerekçe: boyut bir ölçü, para değil.
 *
 * `paths.ts` bucket adları, sınırlar ve nesne yolları hakkında; bir SUNUM
 * fonksiyonu orada yanlış yerdeydi. Sınır sabitleri (`MAX_UPLOAD_BYTES`)
 * orada kalmaya devam ediyor — onlar veri, bu ise gösterim.
 *
 * KB EŞİĞİ KORUNDU: 1 MB'ın altındaki dosyada "0,4 MB" demek yerine "400 kB"
 * demek okunaklı. Birimi de `Intl` yazıyor (`style: "unit"`) — küçük "k"
 * onun SI yazımı. Elde " MB" eklemek, ondalık ayracını elde koymanın başka
 * bir biçimi olurdu.
 */
export function formatBytes(format: Formatter, bytes: number) {
  const mb = bytes / BYTES_PER_MB;
  if (mb >= 1) return format.number(mb, "megabyte");
  return format.number(Math.round(bytes / 1024), "kilobyte");
}
