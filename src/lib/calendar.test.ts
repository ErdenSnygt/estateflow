import { describe, expect, it } from "vitest";
import { createFormatter } from "use-intl";

import {
  MINUTES_PER_DAY,
  addDays,
  addMonths,
  clampStart,
  dayNumber,
  endOfMonth,
  formatDayLong,
  formatDayShort,
  formatDuration,
  formatMinutes,
  formatMonthLong,
  formatTimeRange,
  formatViewLabel,
  formatWeekdayShort,
  isSameMonth,
  layoutOverlaps,
  minutesOfDay,
  monthGrid,
  parseDateKey,
  rangeToIso,
  shiftDate,
  snapToSlot,
  startOfMonth,
  startOfWeek,
  toDateKey,
  toIso,
  viewRange,
  weekDays,
  weekdayIndex,
} from "@/lib/calendar";

/**
 * Takvim matematiği testleri.
 *
 * Buradaki her kural bir ekran hatasına karşılık geliyor: yanlış hafta
 * başlangıcı takvimi bir gün kaydırır, saat dilimi hatası randevuyu komşu
 * güne yazar, çakışma yerleşimindeki hata randevuları üst üste bindirir.
 * Hiçbiri veritabanı gerektirmiyor.
 *
 * -----------------------------------------------------------------------------
 * FAZ 21: GÜN/AY ADLARI ARTIK `Intl`DEN
 * -----------------------------------------------------------------------------
 * Etiket fonksiyonları bir `Formatter` alıyor (gerekçe `lib/calendar.ts`
 * içinde). Test onu GERÇEKTEN kuruyor — sahte bir nesne, `Intl`in gün kaydırıp
 * kaydırmadığını söylemezdi ve asıl risk tam olarak o.
 *
 * Biçimler `i18n/request.ts` ile birebir aynı; oradan sapması ekranda görünen
 * ama testte görünmeyen bir fark üretirdi.
 */

const FORMATS = {
  dateTime: {
    short: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    dayShort: { day: "numeric", month: "short" },
    monthLong: { month: "long", year: "numeric" },
    weekdayLong: { weekday: "long" },
    weekdayShort: { weekday: "short" },
    time: { hour: "2-digit", minute: "2-digit" },
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

describe("saat dilimi (sabit UTC+3)", () => {
  it("UTC gecesini ofis takviminde ertesi güne yazar", () => {
    /* 27 Temmuz 22:00 UTC = 28 Temmuz 01:00 Istanbul. Sunucunun yerel saatine
       göre hesaplasaydık UTC'de çalışan bir sunucu bunu 27'ye yazardı. */
    expect(toDateKey("2026-07-27T22:00:00Z")).toBe("2026-07-28");
    expect(minutesOfDay("2026-07-27T22:00:00Z")).toBe(60);
  });

  it("gün başlangıcı 21:00 UTC'ye denk gelir", () => {
    expect(toIso("2026-07-28", 0)).toBe("2026-07-27T21:00:00.000Z");
    expect(toIso("2026-07-28", 9 * 60)).toBe("2026-07-28T06:00:00.000Z");
  });

  it("ileri geri çevrim kayıpsız", () => {
    const iso = toIso("2026-01-15", 13 * 60 + 45);
    expect(toDateKey(iso)).toBe("2026-01-15");
    expect(minutesOfDay(iso)).toBe(13 * 60 + 45);
  });

  it("kış ayında da aynı ofset (Türkiye'de yaz saati yok)", () => {
    expect(toIso("2026-01-15", 0)).toBe("2026-01-14T21:00:00.000Z");
  });
});

describe("parseDateKey", () => {
  it("geçerli anahtarı kabul eder", () => {
    expect(parseDateKey("2026-07-28")).toBe("2026-07-28");
  });

  it("bozuk biçimi düşürür", () => {
    expect(parseDateKey("28-07-2026")).toBeUndefined();
    expect(parseDateKey("2026-7-8")).toBeUndefined();
    expect(parseDateKey(undefined)).toBeUndefined();
    expect(parseDateKey("")).toBeUndefined();
  });

  it("biçimi doğru ama var olmayan tarihi düşürür", () => {
    /* Elle düzenlenmiş bir link hata sayfası değil, yok sayılmış bir
       parametre üretmeli. */
    expect(parseDateKey("2026-13-01")).toBeUndefined();
    expect(parseDateKey("2026-02-31")).toBeUndefined();
  });

  it("artık yılı tanır", () => {
    expect(parseDateKey("2028-02-29")).toBe("2028-02-29");
    expect(parseDateKey("2027-02-29")).toBeUndefined();
  });
});

describe("gün aritmetiği", () => {
  it("ay sınırını geçer", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("ay eklerken taşmayı ayın son gününe kırpar", () => {
    /* `Date`in kendi davranışı 31 Ocak + 1 ay = 3 Mart; kullanıcı bir ay
       ilerlerken iki ay birden atlamış olurdu. */
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-07-15", 1)).toBe("2026-08-15");
  });

  it("haftayı pazartesiden başlatır", () => {
    // 2026-07-28 bir salı.
    expect(weekdayIndex("2026-07-28")).toBe(1);
    expect(startOfWeek("2026-07-28")).toBe("2026-07-27");
    // Pazar haftanın SONU, başı değil.
    expect(weekdayIndex("2026-08-02")).toBe(6);
    expect(startOfWeek("2026-08-02")).toBe("2026-07-27");
  });

  it("hafta yedi gün ve sıralı", () => {
    const days = weekDays("2026-07-28");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-07-27");
    expect(days[6]).toBe("2026-08-02");
  });

  it("ay sınırlarını bulur", () => {
    expect(startOfMonth("2026-07-28")).toBe("2026-07-01");
    expect(endOfMonth("2026-07-28")).toBe("2026-07-31");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(isSameMonth("2026-07-01", "2026-07-31")).toBe(true);
    expect(isSameMonth("2026-07-31", "2026-08-01")).toBe(false);
  });
});

describe("ay ızgarası", () => {
  it("pazartesiyle başlar, pazarla biter", () => {
    for (const week of monthGrid("2026-07-15")) {
      expect(weekdayIndex(week[0])).toBe(0);
      expect(weekdayIndex(week[6])).toBe(6);
      expect(week).toHaveLength(7);
    }
  });

  it("ayın her gününü kapsar", () => {
    const flat = monthGrid("2026-07-15").flat();
    expect(flat).toContain("2026-07-01");
    expect(flat).toContain("2026-07-31");
  });

  it("satır sayısı sabit değil — boş hafta çizilmiyor", () => {
    /* Şubat 2027 pazartesi başlıyor ve 28 gün: tam dört satır. Her ayı altı
       satıra zorlasaydık tamamı komşu aya ait iki satır çizilirdi. */
    expect(monthGrid("2027-02-10")).toHaveLength(4);
    expect(monthGrid("2026-07-15").length).toBeGreaterThanOrEqual(5);
  });
});

describe("görünüm aralığı", () => {
  it("günlük görünüm tek gün", () => {
    expect(viewRange("gun", "2026-07-28")).toEqual({
      start: "2026-07-28",
      end: "2026-07-28",
    });
  });

  it("haftalık görünüm pazartesi–pazar", () => {
    expect(viewRange("hafta", "2026-07-28")).toEqual({
      start: "2026-07-27",
      end: "2026-08-02",
    });
  });

  it("aylık aralık ızgaranın tamamı, ayın kendisi değil", () => {
    const range = viewRange("ay", "2026-07-15");
    expect(range.start).toBe("2026-06-29");
    expect(range.end).toBe("2026-08-02");
  });

  it("aylık aralık, aynı ayın gün ve hafta aralıklarını kapsar", () => {
    /* Sayfa tek sorguyla üç görünümü besliyor; bu ancak ay aralığı diğer
       ikisini içeriyorsa doğru. */
    const month = viewRange("ay", "2026-07-28");
    const week = viewRange("hafta", "2026-07-28");
    const day = viewRange("gun", "2026-07-28");

    expect(week.start >= month.start).toBe(true);
    expect(week.end <= month.end).toBe(true);
    expect(day.start >= month.start).toBe(true);
    expect(day.end <= month.end).toBe(true);
  });

  it("sorgu sınırları bitiş gününü de kapsıyor", () => {
    const { from, to } = rangeToIso({ start: "2026-07-28", end: "2026-07-28" });
    expect(from).toBe("2026-07-27T21:00:00.000Z");
    // Gün sonu = ertesi günün başlangıcı; sorgu `lt` kullanıyor.
    expect(to).toBe("2026-07-28T21:00:00.000Z");
  });
});

describe("shiftDate", () => {
  it("görünüme göre bir birim hareket eder", () => {
    expect(shiftDate("gun", "2026-07-28", 1)).toBe("2026-07-29");
    expect(shiftDate("hafta", "2026-07-28", 1)).toBe("2026-08-04");
    expect(shiftDate("ay", "2026-07-28", 1)).toBe("2026-08-28");
    expect(shiftDate("ay", "2026-07-28", -1)).toBe("2026-06-28");
  });
});

describe("biçimlendirme", () => {
  it("dakikayı saate çevirir", () => {
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(9 * 60 + 30)).toBe("09:30");
    expect(formatMinutes(23 * 60 + 59)).toBe("23:59");
    // Gün sınırını aşan değer başa dönüyor, negatif üretmiyor.
    expect(formatMinutes(MINUTES_PER_DAY)).toBe("00:00");
    expect(formatMinutes(-60)).toBe("23:00");
  });

  it("saat aralığını ofis saatiyle yazar", () => {
    expect(
      formatTimeRange("2026-07-28T06:00:00Z", "2026-07-28T07:30:00Z"),
    ).toBe("09:00 – 10:30");
  });

  it("süreyi Türkçe kısaltır", () => {
    expect(formatDuration(30)).toBe("30dk");
    expect(formatDuration(60)).toBe("1s");
    expect(formatDuration(90)).toBe("1s 30dk");
  });

  it("gün ve ay etiketleri — Türkçe", () => {
    expect(formatDayLong(tr, "2026-07-28")).toBe("28 Temmuz 2026");
    expect(formatDayShort(tr, "2026-07-28")).toBe("28 Tem");
    expect(formatMonthLong(tr, "2026-07-28")).toBe("Temmuz 2026");
    expect(dayNumber("2026-07-08")).toBe(8);
  });

  it("gün ve ay etiketleri — İngilizce", () => {
    /* Aynı gün anahtarı, farklı dil: hem ay adı hem GÜN/AY SIRASI değişiyor
       ve ikisini de `Intl` çözüyor, biz değil. */
    expect(formatDayLong(en, "2026-07-28")).toBe("July 28, 2026");
    expect(formatDayShort(en, "2026-07-28")).toBe("Jul 28");
    expect(formatMonthLong(en, "2026-07-28")).toBe("July 2026");
  });

  it("gün anahtarı hiçbir dilde komşu güne kaymıyor", () => {
    /* ASIL RİSK BU. Gün anahtarı UTC gece yarısı olarak okunuyor, biçimlendirme
       Europe/Istanbul'da yapılıyor. Türkiye UTC'nin daima ilerisinde olduğu
       için gün aynı kalmalı — ayın ilk ve son günü sınır durumları. */
    expect(formatDayShort(tr, "2026-01-01")).toBe("1 Oca");
    expect(formatDayShort(en, "2026-01-01")).toBe("Jan 1");
    expect(formatDayShort(tr, "2026-12-31")).toBe("31 Ara");
    expect(formatDayShort(en, "2026-12-31")).toBe("Dec 31");
  });

  it("hafta günü adı doğru güne denk geliyor", () => {
    expect(formatWeekdayShort(tr, "2026-07-27")).toBe("Pzt");
    expect(formatWeekdayShort(en, "2026-07-27")).toBe("Mon");
    expect(formatWeekdayShort(en, "2026-08-02")).toBe("Sun");
  });

  it("görünüm başlığı", () => {
    expect(formatViewLabel(tr, "gun", "2026-07-28")).toBe(
      "28 Temmuz 2026, Salı",
    );
    expect(formatViewLabel(tr, "hafta", "2026-07-28")).toBe(
      "27 Tem – 2 Ağu 2026",
    );
    expect(formatViewLabel(tr, "ay", "2026-07-28")).toBe("Temmuz 2026");

    expect(formatViewLabel(en, "gun", "2026-07-28")).toBe(
      "July 28, 2026, Tuesday",
    );
    expect(formatViewLabel(en, "ay", "2026-07-28")).toBe("July 2026");
  });

  it("yıl atlayan haftada iki yılı da yazar", () => {
    expect(formatViewLabel(tr, "hafta", "2026-12-31")).toBe(
      "28 Ara 2026 – 3 Oca 2027",
    );
    expect(formatViewLabel(en, "hafta", "2026-12-31")).toBe(
      "Dec 28 2026 – Jan 3 2027",
    );
  });
});

describe("sürükleme yardımcıları", () => {
  it("dakikayı 15'lik adıma yuvarlar", () => {
    expect(snapToSlot(37)).toBe(30);
    expect(snapToSlot(38)).toBe(45);
    expect(snapToSlot(0)).toBe(0);
  });

  it("randevuyu gün sınırları içinde tutar", () => {
    expect(clampStart(-30, 60)).toBe(0);
    // 23:30'da başlayan 60 dakikalık randevu ertesi güne taşamaz.
    expect(clampStart(23 * 60 + 30, 60)).toBe(23 * 60);
    expect(clampStart(10 * 60 + 7, 60)).toBe(10 * 60);
  });

  it("gün boyu süren randevuda taban sıfır", () => {
    expect(clampStart(600, MINUTES_PER_DAY)).toBe(0);
  });
});

describe("çakışma yerleşimi", () => {
  const item = (id: string, start: number, end: number) => ({
    id,
    startMinutes: start,
    endMinutes: end,
  });

  it("çakışmayan randevular tam genişlik alır", () => {
    const result = layoutOverlaps([
      item("a", 540, 600),
      item("b", 660, 720),
    ]);
    expect(result.every((placement) => placement.columns === 1)).toBe(true);
    expect(result.every((placement) => placement.column === 0)).toBe(true);
  });

  it("iki çakışan randevu yarımşar genişlik alır", () => {
    const result = layoutOverlaps([
      item("a", 540, 660),
      item("b", 600, 720),
    ]);
    expect(result.map((placement) => placement.columns)).toEqual([2, 2]);
    expect(result.map((placement) => placement.column)).toEqual([0, 1]);
  });

  it("biten sütunu yeniden kullanır", () => {
    /* a: 09:00–10:00, b: 09:30–11:00, c: 10:00–11:00.
       c, a'nın bıraktığı sütuna oturabilir — küme yine iki sütun. */
    const result = layoutOverlaps([
      item("a", 540, 600),
      item("b", 570, 660),
      item("c", 600, 660),
    ]);
    const byId = new Map(result.map((placement) => [placement.item.id, placement]));
    expect(byId.get("c")!.column).toBe(0);
    expect(byId.get("b")!.column).toBe(1);
    expect(result.every((placement) => placement.columns === 2)).toBe(true);
  });

  it("ayrı kümeler birbirinin genişliğini etkilemez", () => {
    const result = layoutOverlaps([
      item("a", 540, 660),
      item("b", 600, 720),
      item("c", 780, 840),
    ]);
    const byId = new Map(result.map((placement) => [placement.item.id, placement]));
    expect(byId.get("c")!.columns).toBe(1);
    expect(byId.get("a")!.columns).toBe(2);
  });

  it("her randevu tam olarak bir kez yerleşir", () => {
    const input = [
      item("a", 540, 600),
      item("b", 540, 600),
      item("c", 540, 600),
    ];
    const result = layoutOverlaps(input);
    expect(result).toHaveLength(3);
    expect(new Set(result.map((placement) => placement.column)).size).toBe(3);
    expect(result.every((placement) => placement.columns === 3)).toBe(true);
  });

  it("girdi dizisini değiştirmez", () => {
    const input = [item("b", 600, 660), item("a", 540, 600)];
    layoutOverlaps(input);
    expect(input.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});
