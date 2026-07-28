/**
 * ============================================================================
 * TAKVİM MATEMATİĞİ
 * ============================================================================
 * Izgaranın ihtiyaç duyduğu her hesap burada ve HEPSİ SAF: veritabanı yok,
 * React yok, `Date.now()` bile dışarıdan geçiriliyor. Böylece hafta başlangıcı,
 * ay ızgarası ve çakışma yerleşimi gibi kolayca bozulabilen kurallar testten
 * geçiyor (`calendar.test.ts`).
 *
 * -----------------------------------------------------------------------------
 * SAAT DİLİMİ: SABİT UTC+3, `Date`İN YERELİNE GÜVENİLMİYOR
 * -----------------------------------------------------------------------------
 * Bir takvim, "gün" kavramının nerede başlayıp bittiğine dair kesin bir cevap
 * ister. `new Date(...).getHours()` bu cevabı ÇALIŞTIĞI MAKİNEDEN alır: geliştirme
 * makinesi Istanbul, Vercel sunucusu UTC. Aynı randevu sunucuda 21:00'da,
 * tarayıcıda 00:00'da çizilir; üstüne hydration uyuşmazlığı gelir.
 *
 * Çözüm, ofisin saat dilimini bir SABİT olarak yazmak. Türkiye 2016'dan beri
 * yaz saati uygulamıyor ve yıl boyunca UTC+3; yani tek bir sayı yeterli.
 * Kolonlar `timestamptz` olduğu için saklanan değer yine mutlak an — sabit
 * olan yalnızca "bunu hangi güne yazacağız" kararı.
 *
 * Bu varsayım bir gün değişirse (Türkiye yaz saatine dönerse) tek dokunulacak
 * yer aşağıdaki `OFFICE_UTC_OFFSET_MINUTES` sabiti ve onu okuyan iki fonksiyon
 * olur. `lib/format.ts` zaten `timeZone: "Europe/Istanbul"` ile biçimliyor;
 * ikisi bugün aynı şeyi söylüyor.
 *
 * -----------------------------------------------------------------------------
 * "GÜN ANAHTARI" (dateKey)
 * -----------------------------------------------------------------------------
 * Takvimin dolaştığı birim bir `Date` değil, `"2026-07-28"` biçiminde bir metin.
 * Nedeni: URL'de bu duruyor, `<input type="date">` bunu üretiyor ve iki gün
 * anahtarı `===` ile karşılaştırılabiliyor — `Date` nesneleri karşılaştırılamaz.
 */

/** Türkiye yıl boyunca UTC+3 (2016'dan beri yaz saati yok). */
export const OFFICE_UTC_OFFSET_MINUTES = 180;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Izgaranın bir satırı = 30 dakika. */
export const SLOT_MINUTES = 30;

/** Sürükle-bırak ve slot tıklamasının yuvarlandığı adım. */
export const SNAP_MINUTES = 15;

/** Yeni randevunun varsayılan süresi. */
export const DEFAULT_DURATION_MINUTES = 60;

export const MINUTES_PER_DAY = 1440;

/** `"2026-07-28"` biçiminde ofis takvim günü. */
export type DateKey = string;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/* ==========================================================================
   An ↔ ofis takvimi
   ========================================================================== */

type OfficeParts = {
  year: number;
  month: number; // 1-12
  day: number;
  minutes: number; // gece yarısından beri geçen dakika
};

function toOfficeParts(value: string | number | Date): OfficeParts {
  const instant =
    value instanceof Date ? value.getTime() : new Date(value).getTime();

  /* Anı ofis saatine kaydırıp UTC olarak OKUMAK, saat dilimi çözümlemesini
     tamamen aradan çıkarıyor: aritmetik, `Date`in yerel ayarına hiç uğramıyor. */
  const shifted = new Date(instant + OFFICE_UTC_OFFSET_MINUTES * MS_PER_MINUTE);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** Bir anın düştüğü ofis günü. */
export function toDateKey(value: string | number | Date): DateKey {
  const parts = toOfficeParts(value);
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** Bir anın ofis gününde gece yarısından beri geçen dakika. */
export function minutesOfDay(value: string | number | Date): number {
  return toOfficeParts(value).minutes;
}

/** Gün anahtarı + dakika → mutlak an (ISO). Veritabanına bu yazılıyor. */
export function toInstant(date: DateKey, minutes: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, 0, minutes - OFFICE_UTC_OFFSET_MINUTES),
  );
}

export function toIso(date: DateKey, minutes: number): string {
  return toInstant(date, minutes).toISOString();
}

/**
 * Geçersiz anahtarı sessizce düşürür.
 *
 * `search-params.ts` ile aynı kural: elle düzenlenmiş bir link hata sayfası
 * değil, yok sayılmış bir parametre üretir. `2026-02-31` gibi biçimi doğru ama
 * gerçek olmayan tarihler de buradan geçemiyor — geri çevirip karşılaştırıyoruz.
 */
export function parseDateKey(value: string | undefined): DateKey | undefined {
  if (!value || !DATE_KEY.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

/* ==========================================================================
   Gün aritmetiği
   ========================================================================== */

/** Anahtarı gün ortasına sabitler: aritmetik hiçbir sınır durumuna yaklaşmaz. */
function keyToUtcNoon(date: DateKey): number {
  return new Date(`${date}T12:00:00Z`).getTime();
}

function utcToKey(ms: number): DateKey {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: DateKey, amount: number): DateKey {
  return utcToKey(keyToUtcNoon(date) + amount * MS_PER_DAY);
}

export function addMonths(date: DateKey, amount: number): DateKey {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + amount, 1, 12));
  /* Ayın gün sayısı taşarsa (31 Ocak + 1 ay) ayın son gününe kırpılıyor;
     `Date`in kendi taşma davranışı 3 Mart'a atlar ve kullanıcı bir ay ileri
     giderken iki ay birden atlamış olurdu. */
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  return utcToKey(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay), 12),
  );
}

/** 0 = Pazartesi … 6 = Pazar. Türkiye'de hafta pazartesi başlar. */
export function weekdayIndex(date: DateKey): number {
  return (new Date(keyToUtcNoon(date)).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: DateKey): DateKey {
  return addDays(date, -weekdayIndex(date));
}

export function startOfMonth(date: DateKey): DateKey {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: DateKey): DateKey {
  const [year, month] = date.split("-").map(Number);
  return utcToKey(Date.UTC(year, month, 0, 12));
}

export function isSameMonth(a: DateKey, b: DateKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Bir haftanın yedi günü, pazartesiden. */
export function weekDays(date: DateKey): DateKey[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/**
 * Ay ızgarası — hafta hafta.
 *
 * Satır sayısı SABİT DEĞİL (4–6). Her ayı altı satıra zorlamak, Şubat gibi
 * aylarda tamamı komşu aya ait boş bir satır çizmek demekti; ızgara yüksekliği
 * satır sayısına göre esniyor.
 */
export function monthGrid(date: DateKey): DateKey[][] {
  const first = startOfWeek(startOfMonth(date));
  const last = endOfMonth(date);

  const weeks: DateKey[][] = [];
  let cursor = first;

  do {
    weeks.push(weekDays(cursor));
    cursor = addDays(cursor, 7);
  } while (cursor <= last);

  return weeks;
}

/* ==========================================================================
   Görünümler
   ========================================================================== */

export const CALENDAR_VIEWS = ["gun", "hafta", "ay"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const CALENDAR_VIEW_LABELS: Record<CalendarView, string> = {
  gun: "Gün",
  hafta: "Hafta",
  ay: "Ay",
};

/**
 * Görünümün kapsadığı gün aralığı — veri sorgusu bunu kullanıyor.
 *
 * Ay görünümünde aralık ayın kendisi DEĞİL, ızgaranın tamamı: ilk satırda
 * geçen ayın son günleri var ve o günlerin randevuları da çiziliyor.
 */
export function viewRange(
  view: CalendarView,
  date: DateKey,
): { start: DateKey; end: DateKey } {
  switch (view) {
    case "gun":
      return { start: date, end: date };
    case "hafta": {
      const days = weekDays(date);
      return { start: days[0], end: days[6] };
    }
    case "ay": {
      const weeks = monthGrid(date);
      return { start: weeks[0][0], end: weeks[weeks.length - 1][6] };
    }
  }
}

/** Aralığın sorgu sınırları — bitiş günü DAHİL. */
export function rangeToIso(range: { start: DateKey; end: DateKey }): {
  from: string;
  to: string;
} {
  return {
    from: toIso(range.start, 0),
    to: toIso(range.end, MINUTES_PER_DAY),
  };
}

/* ==========================================================================
   Zaman biçimlendirme
   ========================================================================== */

/** 570 → "09:30" */
export function formatMinutes(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

/** "09:30 – 10:30" */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatMinutes(minutesOfDay(startIso))} – ${formatMinutes(minutesOfDay(endIso))}`;
}

/** 90 → "1s 30dk" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}dk`;
  if (rest === 0) return `${hours}s`;
  return `${hours}s ${rest}dk`;
}

/* ==========================================================================
   Gün / ay etiketleri
   ========================================================================== */

/**
 * Ay ve gün adları SABİT DİZİ, `Intl` değil.
 *
 * `data/sales.ts` grafik ekseni için aynı şeyi yapıyor ve gerekçe aynı: gün
 * anahtarı zaten ofis takviminde: onu `Date`e çevirip `Intl`e vermek, kaçındığımız
 * saat dilimi çözümlemesini geri getirirdi. Tek dil konuşan bir arayüzde on
 * dokuz kelimeyi elde tutmak daha ucuz.
 */
const MONTH_LONG = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
] as const;

const MONTH_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
] as const;

/** Pazartesiden başlar — `weekdayIndex` ile aynı sıra. */
export const WEEKDAY_SHORT = [
  "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz",
] as const;

export const WEEKDAY_LONG = [
  "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
] as const;

/** Ayın kaçıncı günü. */
export function dayNumber(date: DateKey): number {
  return Number(date.slice(8, 10));
}

/** "28 Temmuz 2026" */
export function formatDayLong(date: DateKey): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTH_LONG[month - 1]} ${year}`;
}

/** "28 Tem" */
export function formatDayShort(date: DateKey): string {
  const [, month, day] = date.split("-").map(Number);
  return `${day} ${MONTH_SHORT[month - 1]}`;
}

/** "Temmuz 2026" */
export function formatMonthLong(date: DateKey): string {
  const [year, month] = date.split("-").map(Number);
  return `${MONTH_LONG[month - 1]} ${year}`;
}

/** Görünüm başlığı: gün, hafta aralığı ya da ay. */
export function formatViewLabel(view: CalendarView, date: DateKey): string {
  switch (view) {
    case "gun":
      return `${formatDayLong(date)}, ${WEEKDAY_LONG[weekdayIndex(date)]}`;
    case "hafta": {
      const days = weekDays(date);
      const sameYear = days[0].slice(0, 4) === days[6].slice(0, 4);
      return sameYear
        ? `${formatDayShort(days[0])} – ${formatDayShort(days[6])} ${days[6].slice(0, 4)}`
        : `${formatDayShort(days[0])} ${days[0].slice(0, 4)} – ${formatDayShort(days[6])} ${days[6].slice(0, 4)}`;
    }
    case "ay":
      return formatMonthLong(date);
  }
}

/** Görünümün bir birim ileri/geri gitmesi. */
export function shiftDate(
  view: CalendarView,
  date: DateKey,
  direction: 1 | -1,
): DateKey {
  switch (view) {
    case "gun":
      return addDays(date, direction);
    case "hafta":
      return addDays(date, direction * 7);
    case "ay":
      return addMonths(date, direction);
  }
}

/* ==========================================================================
   Çakışma yerleşimi
   ========================================================================== */

export type Placeable = {
  id: string;
  /** Gün içindeki başlangıç dakikası (0–1440). */
  startMinutes: number;
  /** Gün içindeki bitiş dakikası; gece yarısını aşan randevu kırpılır. */
  endMinutes: number;
};

export type Placement<T extends Placeable> = {
  item: T;
  /** Kaçıncı sütun (0 tabanlı). */
  column: number;
  /** Kümedeki toplam sütun sayısı — genişlik bundan çıkıyor. */
  columns: number;
};

/**
 * Çakışan randevuları yan yana sütunlara dizer.
 *
 * Google Calendar'ın yaptığı iş: üst üste binen randevular birbirini
 * gizlemesin diye günü ÇAKIŞMA KÜMELERİNE bölüp her kümede en az sayıda sütun
 * kullanmak. Algoritma iki adım:
 *
 *  1. Randevular başlangıca göre sıralanır; bir öncekilerin en geç bitişinden
 *     sonra başlayan randevu YENİ BİR KÜME açar.
 *  2. Küme içinde her randevu, kendisiyle çakışmayan ilk sütuna yerleşir.
 *
 * Genişlik küme başına hesaplanıyor: iki randevuluk bir kümede ikisi de yarım
 * genişlik alır, tek başına duran randevu tam genişlik.
 */
export function layoutOverlaps<T extends Placeable>(items: T[]): Placement<T>[] {
  const sorted = [...items].sort(
    (a, b) =>
      a.startMinutes - b.startMinutes ||
      b.endMinutes - a.endMinutes ||
      a.id.localeCompare(b.id),
  );

  const placements: Placement<T>[] = [];
  let cluster: Placement<T>[] = [];
  /** Kümedeki sütunların o ana kadarki bitiş dakikaları. */
  let columnEnds: number[] = [];
  let clusterEnd = -Infinity;

  function flush() {
    for (const placement of cluster) placement.columns = columnEnds.length;
    placements.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterEnd = -Infinity;
  }

  for (const item of sorted) {
    if (item.startMinutes >= clusterEnd && cluster.length > 0) flush();

    let column = columnEnds.findIndex((end) => end <= item.startMinutes);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(item.endMinutes);
    } else {
      columnEnds[column] = item.endMinutes;
    }

    cluster.push({ item, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMinutes);
  }

  if (cluster.length > 0) flush();

  return placements;
}

/* ==========================================================================
   Sürükle-bırak yardımcıları
   ========================================================================== */

/** Dakikayı `SNAP_MINUTES` adımına yuvarlar. */
export function snapToSlot(minutes: number, step = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

/**
 * Sürüklenen randevunun yeni başlangıcı.
 *
 * Süre KORUNUR — sürükleme bir taşıma işlemi, yeniden boyutlandırma değil.
 * Sonuç gün sınırlarına sıkıştırılıyor: randevu ne gece yarısından önce
 * başlayabilir ne de bitişi ertesi güne taşabilir.
 */
export function clampStart(
  startMinutes: number,
  durationMinutes: number,
): number {
  const latest = MINUTES_PER_DAY - durationMinutes;
  return Math.min(Math.max(snapToSlot(startMinutes), 0), Math.max(latest, 0));
}
