import { getRequestConfig } from "next-intl/server";

import { getUserLocale } from "@/i18n/locale";

/**
 * ============================================================================
 * next-intl İSTEK YAPILANDIRMASI
 * ============================================================================
 * Her sunucu render'ında bir kez çalışıyor ve o istek için dili + çeviri
 * sözlüğünü belirliyor. `next.config.mjs` içindeki `createNextIntlPlugin` bu
 * dosyayı yola bakarak buluyor.
 *
 * -----------------------------------------------------------------------------
 * SÖZLÜK NEDEN DİNAMİK `import()` İLE
 * -----------------------------------------------------------------------------
 * Statik import iki dilin sözlüğünü de sunucu paketine koyardı. Dinamik
 * import'ta yalnızca istenen dil yükleniyor ve daha önemlisi, sözlük
 * BÜYÜDÜKÇE bu karar değer kazanıyor: Faz 19 yalnızca gezinme metinleriyle
 * başlıyor ama sonraki fazlarda on iki modülün tamamı ekleniyor.
 *
 * `.default` gerekiyor çünkü JSON modülleri varsayılan dışa aktarımla geliyor.
 */
export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,

    /* ZAMAN DİLİMİ SABİT. Uygulamanın geri kalanı da öyle çalışıyor
       (`lib/calendar.ts` → sabit UTC+3): ofis tek ve İstanbul'da. Sunucu
       saat dilimi Vercel'de UTC, kullanıcının tarayıcısı ise yerel — ikisini
       serbest bırakmak, aynı randevunun sunucuda ve istemcide farklı saatte
       çizilmesi demekti (hydration uyuşmazlığı). */
    timeZone: "Europe/Istanbul",

    /* ==================================================================
       TARİH VE SAYI BİÇİMLERİ
       ==================================================================
       ADLANDIRILMIŞ BİÇİMLER, çağrı yerinde seçenek nesnesi değil: aynı
       biçimi on iki modülde tekrar yazmak, birinin `year: "2-digit"`
       yazmasıyla sapardı. Modül fazları `format.dateTime(x, "short")`
       diyecek.

       ------------------------------------------------------------------
       KARAR: TARİH DİLE GÖRE DEĞİŞİR, PARA BİRİMİ DEĞİŞMEZ
       ------------------------------------------------------------------
       TARİH çevrilir. Ay adları ve gün/ay sırası dilin parçası; İngilizce
       arayüzde "31 Tem 2026" okunmuyor. `Intl` bunu aktif dile göre kendisi
       çözüyor — biçimlerde yalnızca ALAN SEÇİMİ var (gün/ay/yıl), sıralama
       yok.

       PARA BİRİMİ ÇEVRİLMEZ ve `lib/format.ts` içindeki `tr-TR` sabiti
       KALIYOR. Gerekçe: tutar Türk Lirası ve sözleşmede, tapuda, ilan
       portalında hep "18.450.000" yazıyor. Arayüz dili İngilizce diye
       "18,450,000" göstermek, aynı sayının iki farklı yazımını üretir ve
       Türkiye'de nokta binlik ayracı olduğu için bu bir OKUMA HATASI
       riskidir — kullanıcı 18 milyonu 18 bin sanabilir. Para, arayüz
       metninden çok VERİYE yakın duruyor; seed başlıkları gibi
       çevrilmiyor.

       ------------------------------------------------------------------
       DÜZELTME (Faz 25): YÜZDE PARA DEĞİL
       ------------------------------------------------------------------
       Yukarıdaki paragrafın bir uzantısı olarak yüzde de `tr-TR`de
       bırakılmıştı. Yanlıştı: sabit kararın gerekçesi TUTARIN kendisiydi
       (aynı rakamın sözleşmedeki yazımıyla uyuşması), oran ise bir ölçü.
       Türkçe arayüzde "%2.0" yazıyordu — Türkçede ondalık ayracı virgül.

       Yüzde artık `Intl`e devredildi ve işaretin YERİNİ de o koyuyor:
       tr → "%2,0", en → "2.0%". Bu, işaret yerini sözlükte tutan eski
       çözümden daha doğru; bilgi tek yerde.

       Adet ve alan (`formatNumber`, `formatArea`) `tr-TR`de KALIYOR:
       ikisi de fiyatla aynı satırda görünüyor ve orada binlik ayracın
       şaşması para okumasını bozardı. */
    formats: {
      number: {
        /** %2,0 · 2.0% — prim/komisyon oranı. Girdi ORAN (0.02), yüzde değil. */
        rate: {
          style: "percent",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        },
        /** %42 · 42% — ilerleme ve pay. Girdi yine ORAN (0.42). */
        percent: { style: "percent", maximumFractionDigits: 0 },
        /* +%12,4 · +12.4% — KPI kartındaki döneme göre değişim.
           `signDisplay: "exceptZero"` ARTI İŞARETİNİ DE devralıyor; kart onu
           elle ekliyordu ve eksi durumunda `Intl`inkiyle çakışıyordu. Sıfırda
           işaret yok — "+%0" bir değişim varmış izlenimi verirdi. */
        delta: {
          style: "percent",
          maximumFractionDigits: 1,
          signDisplay: "exceptZero",
        },

        /* DOSYA BOYUTU da bir ölçü, para değil — yüzdeyle aynı gerekçe.
           `style: "unit"` seçildi çünkü sayı, ayraç ve birim tek bir
           çağrıdan çıkıyor; elde " MB" eklemek, ondalık ayracını elde
           değiştirmenin başka bir biçimi olurdu. */
        /** 8,0 MB · 8.0 MB */
        megabyte: {
          style: "unit",
          unit: "megabyte",
          unitDisplay: "short",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        },
        /** 400 kB — `Intl` SI yazımını kullanıyor (küçük k). */
        kilobyte: {
          style: "unit",
          unit: "kilobyte",
          unitDisplay: "short",
          maximumFractionDigits: 0,
        },
      },
      dateTime: {
        /** 31 Tem 2026 · Jul 31, 2026 — listelerde ve satırlarda. */
        short: { day: "numeric", month: "short", year: "numeric" },
        /** 31 Temmuz 2026 · July 31, 2026 — detay sayfalarında. */
        long: { day: "numeric", month: "long", year: "numeric" },
        /* 31 Tem · Jul 31 — YIL YOK. Randevu satırı gibi dar yerlerde
           kullanılıyor; oradaki liste zaten yakın tarihleri gösteriyor ve
           yıl satırı gereksiz uzatıyordu (`lib/calendar.ts` → eski
           `formatDayShort` de yılsızdı, biçim onunla aynı kaldı). */
        dayShort: { day: "numeric", month: "short" },
        /** Temmuz 2026 · July 2026 — ay ızgarasının başlığı. */
        monthLong: { month: "long", year: "numeric" },
        /** Tem · Jul — gelir ve satış grafiklerinin ekseni; yer dar. */
        monthShort: { month: "short" },
        /** Salı · Tuesday — günlük görünümün başlığı. */
        weekdayLong: { weekday: "long" },
        /** Sal · Tue — hafta ve ay ızgarasının sütun başlıkları. */
        weekdayShort: { weekday: "short" },
        /** Randevu saatleri. */
        time: { hour: "2-digit", minute: "2-digit" },
      },
    },

    /* Eksik anahtar ÜRETİMDE SESSİZ, geliştirmede gürültülü.
       Faz 19 modül modül ilerliyor; henüz çevrilmemiş bir modülün anahtarı
       geçici olarak eksik olabiliyor. Üretimde bunun kullanıcıya kırmızı bir
       hata olarak yansıması, çeviri eksiğini çalışma zamanı hatasına
       çevirmek olurdu — next-intl zaten anahtarın kendisini basıyor ve bu
       okunabilir bir yedek. */
    onError(error) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`[i18n] ${error.message}`);
      }
    },
  };
});
