import { describe, expect, it } from "vitest";
import { createFormatter } from "use-intl";

import {
  formatBytes,
  formatDelta,
  formatPercent,
  formatRate,
} from "@/i18n/numbers";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/paths";

/**
 * ============================================================================
 * YÜZDE BİÇİMİ
 * ============================================================================
 * Bu testlerin derdi iki ayrıntı ve ikisi de gerçek bir hatadan geliyor:
 *
 *  1. ONDALIK AYRACI. Prim oranı `toFixed(1)` ile üretiliyordu ve `toFixed`
 *     her zaman NOKTA veriyor — Türkçe arayüzde "%2.0" yazıyordu. Türkçede
 *     ayraç virgül.
 *  2. İŞARETİN YERİ. Türkçede sayının önünde, İngilizcede arkasında. Faz 25'e
 *     kadar bu bilgi çeviri metninde elle tutuluyordu; artık `Intl` koyuyor.
 *
 * `i18n/request.ts` içindeki biçim adlarının kopyası burada duruyor çünkü o
 * dosya `getRequestConfig` ile sarılı ve test ortamında çağrılamıyor
 * (`calendar.test.ts` ve `dates.test.ts` ile aynı kurgu).
 */

const FORMATS = {
  number: {
    rate: {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
    percent: { style: "percent", maximumFractionDigits: 0 },
    delta: {
      style: "percent",
      maximumFractionDigits: 1,
      signDisplay: "exceptZero",
    },
    megabyte: {
      style: "unit",
      unit: "megabyte",
      unitDisplay: "short",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
    kilobyte: {
      style: "unit",
      unit: "kilobyte",
      unitDisplay: "short",
      maximumFractionDigits: 0,
    },
  },
} as const;

function formatterFor(locale: "tr" | "en") {
  return createFormatter({
    locale,
    timeZone: "Europe/Istanbul",
    formats: FORMATS as never,
  });
}

const tr = formatterFor("tr");
const en = formatterFor("en");

/** `Intl` bazı dillerde araya bölünemez boşluk koyuyor; testler ona takılmasın. */
const plain = (value: string) => value.replace(/ /g, " ");

describe("formatRate", () => {
  it("ondalık ayracı dile göre değişiyor", () => {
    /* Asıl düzeltilen hata: Türkçede "%2.0" yazıyordu. */
    expect(plain(formatRate(tr, 0.02))).toBe("%2,0");
    expect(plain(formatRate(en, 0.02))).toBe("2.0%");
  });

  it("işaretin yeri dile göre değişiyor ve bunu sözlük değil Intl biliyor", () => {
    expect(plain(formatRate(tr, 0.025)).startsWith("%")).toBe(true);
    expect(plain(formatRate(en, 0.025)).endsWith("%")).toBe(true);
  });

  it("bir ondalık basamak SABİT — %2 ile %2,5 farkı hakediş demek", () => {
    expect(plain(formatRate(tr, 0.02))).toContain(",0");
    expect(plain(formatRate(tr, 0.0225))).toBe("%2,3");
  });

  it("girdi oran, yüzde değil", () => {
    /* Yüzü unutmak "%200" gösterirdi; sözleşme `i18n/numbers.ts` başlığında. */
    expect(plain(formatRate(tr, 1))).toBe("%100,0");
  });
});

describe("formatPercent", () => {
  it("ondalıksız ve dile göre yerleşimli", () => {
    expect(plain(formatPercent(tr, 0.42))).toBe("%42");
    expect(plain(formatPercent(en, 0.42))).toBe("42%");
  });

  it("kesirli oranı yuvarlıyor", () => {
    expect(plain(formatPercent(tr, 0.666))).toBe("%67");
  });

  it("sıfır ve tam oran uçları", () => {
    expect(plain(formatPercent(en, 0))).toBe("0%");
    expect(plain(formatPercent(en, 1))).toBe("100%");
  });
});

describe("formatDelta", () => {
  it("işareti de Intl koyuyor — kart elle ekliyordu", () => {
    /* Eski kod `{up ? "+" : ""}` yazıyordu; eksi değerde `Intl`in kendi
       işaretiyle çakışma riski taşıyordu. */
    expect(plain(formatDelta(tr, 0.124))).toBe("+%12,4");
    expect(plain(formatDelta(en, 0.124))).toBe("+12.4%");
    expect(plain(formatDelta(tr, -0.08))).toBe("-%8");
  });

  it("sıfırda işaret yok", () => {
    /* "+%0" olmayan bir değişim varmış izlenimi verirdi. */
    expect(plain(formatDelta(tr, 0))).toBe("%0");
    expect(plain(formatDelta(en, 0))).toBe("0%");
  });

  it("ondalık basamak ZORUNLU değil — tam sayı sade kalıyor", () => {
    expect(plain(formatDelta(tr, 0.12))).toBe("+%12");
  });
});

describe("formatBytes", () => {
  /**
   * `lib/storage/paths.test.ts`ten taşındı. Oradaki iki test Türkçe virgülü
   * ARADIĞI için hatayı göremiyordu — fonksiyon ayracı elle koyuyordu
   * (`.replace(".", ",")`) ve test de onu doğruluyordu. Soru artık "virgül var
   * mı" değil, "dile göre doğru ayraç mı".
   */
  const MB = 1024 * 1024;

  it("ondalık ayracı dile göre değişiyor", () => {
    expect(plain(formatBytes(tr, 8 * MB))).toBe("8,0 MB");
    expect(plain(formatBytes(en, 8 * MB))).toBe("8.0 MB");
  });

  it("bir MB üstünü MB, altını kB gösterir", () => {
    /* Eşik korundu: 400 KB'lık bir dosyada "0,4 MB" demek okunaksız. */
    expect(plain(formatBytes(tr, 1.5 * MB))).toBe("1,5 MB");
    expect(plain(formatBytes(tr, 400 * 1024))).toBe("400 kB");
    expect(plain(formatBytes(en, 400 * 1024))).toBe("400 kB");
  });

  it("yükleme sınırı okunabilir bir değer üretiyor", () => {
    expect(plain(formatBytes(tr, MAX_UPLOAD_BYTES))).toBe("8,0 MB");
    expect(plain(formatBytes(en, MAX_UPLOAD_BYTES))).toBe("8.0 MB");
  });

  it("birimi de Intl yerleştiriyor — elde eklenen bir metin yok", () => {
    /* `style: "unit"` seçilmesinin sebebi bu: sayı, ayraç ve birim tek bir
       `Intl` çağrısından çıkıyor. Elde " MB" eklemek, ondalık ayracını
       elde koymanın başka bir biçimi olurdu. */
    for (const f of [tr, en]) {
      expect(formatBytes(f, 8 * MB).endsWith("MB")).toBe(true);
      expect(formatBytes(f, 400 * 1024).endsWith("kB")).toBe(true);
    }
  });
});

describe("para birimi bu değişikliğin dışında", () => {
  it("tutar her dilde tr-TR kalıyor", async () => {
    /* Faz 20'nin kararı YALNIZCA para için geçerliydi; yüzde Faz 25'te
       ayrıldı. Tutar hâlâ `lib/format.ts` üzerinden ve dilden bağımsız. */
    const { formatCurrency } = await import("@/lib/format");
    expect(plain(formatCurrency(18_450_000))).toContain("18.450.000");
  });
});
