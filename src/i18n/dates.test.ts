import { describe, expect, it } from "vitest";
import { createFormatter } from "use-intl";

import { EMPTY_DATE, formatDate, formatMonthKey, formatRelative } from "@/i18n/dates";

/**
 * ============================================================================
 * DİL BİLEN TARİH BİÇİMLENDİRME
 * ============================================================================
 * Faz 25'te `lib/format.ts` içindeki `formatDate` / `formatShortDate` /
 * `formatRelativeTime` silindi — hepsi sabit `tr-TR` kullanıyordu ve son
 * çağıranları da bu fazda `i18n/dates.ts`e geçti. `format.test.ts` içindeki
 * karşılıkları buraya taşındı; korudukları davranış AYNI, tek fark artık iki
 * dilde de sınanıyor olması:
 *
 *  1. SAAT DİLİMİ SABİT. Sunucu (UTC) ile tarayıcı (Europe/Istanbul) farklı
 *     çözerse aynı tarih iki farklı gün gösterir — hydration uyuşmazlığı.
 *  2. `formatRelative` REFERANS ANINI parametre alıyor; varsayılan olsaydı
 *     aynı sorun oradan girerdi.
 *  3. Yedi günlük eşik: daha eskisi göreli değil, mutlak tarih.
 *
 * `createFormatter` gerçek biçimlendirici — `i18n/request.ts` içindeki biçim
 * adlarının kopyası burada duruyor çünkü o dosya `getRequestConfig` ile
 * sarılı ve test ortamında çağrılamıyor (`calendar.test.ts` ile aynı kurgu).
 */

const FORMATS = {
  dateTime: {
    short: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    dayShort: { day: "numeric", month: "short" },
    monthShort: { month: "short" },
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

describe("formatDate", () => {
  it("boş değerde tire gösterir", () => {
    /* `published_at` ve `last_contact_at` null olabiliyor;
       `new Date(null)` "Invalid Date" basardı. */
    expect(formatDate(tr, null)).toBe(EMPTY_DATE);
    expect(formatDate(en, undefined)).toBe(EMPTY_DATE);
    expect(formatDate(tr, "")).toBe(EMPTY_DATE);
  });

  it("saat dilimi sabittir — gün kayması yaşanmaz", () => {
    /* UTC'de 21:00, İstanbul'da ertesi gün 00:00. Biçimlendirici
       Europe/Istanbul'a sabitli olduğu için 21 Temmuz demeli. */
    expect(formatDate(tr, "2026-07-20T21:00:00Z")).toContain("21");
    expect(formatDate(tr, "2026-07-20T21:00:00Z")).toContain("Temmuz");
  });

  it("ay adı ve alan sırası dile göre değişiyor", () => {
    const value = "2026-03-23T09:00:00Z";
    expect(formatDate(tr, value)).toContain("Mart");
    expect(formatDate(en, value)).toContain("March");
    /* SIRALAMA `Intl`de, biçim tanımında değil: İngilizce'de ay başa
       geçiyor ve bunun için hiçbir şey yapılmıyor. */
    expect(formatDate(en, value).indexOf("March")).toBe(0);
  });

  it("kısa biçim yılı taşır, dayShort taşımaz", () => {
    const value = "2026-07-20T09:00:00Z";
    expect(formatDate(tr, value, "short")).toContain("2026");
    expect(formatDate(tr, value, "dayShort")).not.toContain("2026");
  });
});

describe("formatRelative", () => {
  const now = Date.parse("2026-07-20T12:00:00Z");

  it("yakın geçmişi göreli ifadeyle verir", () => {
    expect(formatRelative(tr, "2026-07-20T11:45:00Z", now)).toContain("dakika");
    expect(formatRelative(en, "2026-07-20T09:00:00Z", now)).toContain("hour");
  });

  it("bir haftadan eskiyse mutlak tarihe döner", () => {
    /* next-intl'in `relativeTime`ı bu eşiği kendi bilmiyor — "2 months ago"
       derdi, oysa bir iş notunun tam tarihi o mesafede daha kullanışlı. */
    const result = formatRelative(tr, "2026-06-12T12:00:00Z", now);
    expect(result).toContain("2026");
    expect(result).not.toContain("önce");
  });

  it("tam yedi gün eşiği mutlak tarafta", () => {
    const seven = "2026-07-13T12:00:00Z";
    expect(formatRelative(tr, seven, now)).toContain("2026");
  });

  it("referans anı zorunludur — aynı girdi, farklı referans, farklı sonuç", () => {
    const value = "2026-07-20T11:00:00Z";
    const early = formatRelative(tr, value, Date.parse("2026-07-20T11:05:00Z"));
    const late = formatRelative(tr, value, Date.parse("2026-07-20T18:00:00Z"));
    expect(early).not.toBe(late);
  });
});

describe("formatMonthKey", () => {
  it("veri katmanının anahtarını ay adına çeviriyor", () => {
    /* `lib/data/revenue.ts` "2026-04" üretiyor; Faz 25'e kadar yanına sabit
       Türkçe bir kısaltma ("Nis") koyuyordu. */
    expect(formatMonthKey(tr, "2026-04")).toBe("Nis");
    expect(formatMonthKey(en, "2026-04")).toBe("Apr");
  });

  it("ayın biri UTC'de seçiliyor ama ay şaşmıyor", () => {
    /* Europe/Istanbul her zaman UTC'nin İLERİSİNDE, yani gün geriye
       kaymıyor. Amerika saat dilimlerinde bu tutmazdı ve ocak "Ara"
       görünürdü. */
    expect(formatMonthKey(tr, "2026-01")).toBe("Oca");
    expect(formatMonthKey(tr, "2026-12")).toBe("Ara");
  });
});
