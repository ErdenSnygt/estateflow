import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import tr from "../../messages/tr.json";
import { LOCALE_LABELS, defaultLocale, locales, toLocale } from "@/i18n/config";

/**
 * ============================================================================
 * SÖZLÜK BÜTÜNLÜĞÜ
 * ============================================================================
 * `types/i18n.d.ts` çeviri anahtarlarını TypeScript'e bildiriyor ama referans
 * dosya olarak yalnızca `tr.json`u kullanıyor. Yani yanlış yazılmış bir anahtar
 * derleme zamanında yakalanıyor; `en.json`da EKSİK kalan bir anahtar
 * yakalanmıyor — o dosya tipe hiç girmiyor.
 *
 * Bu testler o boşluğu kapatıyor. Faz 19 çeviriyi modül modül ilerlettiği için
 * bu denetim tek seferlik değil: her yeni modülde iki dosya birlikte
 * büyümeli, biri geride kalırsa test düşsün.
 */

/** İç içe nesneyi `a.b.c` biçiminde düz anahtar listesine çevirir. */
function flatten(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Bir metindeki ICU argümanlarını toplar.
 *
 * İki biçim var ve İKİSİ DE yakalanmalı:
 *   · düz     → `{date}`
 *   · çoğul   → `{count, plural, =1 {…} other {…}}`
 *
 * İkincisi Faz 20'nin sonunda gerekti: "3 interested customers" İngilizce'de
 * sayı 1 olduğunda kırılıyor, Türkçe'de kırılmıyor (sayıdan sonra çoğul eki
 * yok). Yani AYNI anahtar bir dilde düz, diğerinde çoğul olabiliyor — o yüzden
 * karşılaştırma metnin şekline değil, ARGÜMAN ADINA bakıyor.
 *
 * SINIR: bu bir ICU ayrıştırıcısı değil, bir düzenli ifade. Çoğul alt
 * mesajlarının gövdesini de tarıyor, yani `other {yok}` gibi TEK KELİMELİK bir
 * alt mesaj yanlışlıkla argüman sanılırdı. Mevcut sözlükte öyle bir değer yok
 * (alt mesajlar `#` ile ya da birden çok kelimeyle başlıyor) ve bu kural
 * bilinçli: tam ayrıştırıcı için `@formatjs/icu-messageformat-parser`
 * eklemek, tek bir testin kazanacağı kesinlik için fazla ağır.
 */
const ICU_ARGUMENT =
  /\{\s*(\w+)\s*(?:\}|,\s*(?:plural|select|selectordinal|number|date|time)\b)/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(ICU_ARGUMENT)].map((match) => match[1]).sort();
}

/** Düz anahtardan değeri okur. */
function read(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node as Record<string, unknown> | undefined)?.[key],
      source,
    );
}

const trKeys = flatten(tr).sort();
const enKeys = flatten(en).sort();

describe("sözlük anahtarları", () => {
  it("iki dilde de aynı anahtarlar var", () => {
    expect(enKeys).toEqual(trKeys);
  });

  it("İngilizce'de eksik anahtar yok", () => {
    /* Ayrı bir test: yukarıdaki eşitlik düştüğünde hangi yönde eksik olduğu
       hata çıktısından anlaşılsın. */
    expect(trKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
  });

  it("Türkçe'de fazladan anahtar yok", () => {
    expect(enKeys.filter((key) => !trKeys.includes(key))).toEqual([]);
  });

  it("hiçbir değer boş değil", () => {
    /* Boş bir çeviri, arayüzde sessizce kaybolan bir metin demek — eksik
       anahtardan daha kötüsü, çünkü hiçbir uyarı üretmiyor. */
    for (const key of trKeys) {
      expect(String(read(tr, key)).trim(), `tr → ${key}`).not.toBe("");
      expect(String(read(en, key)).trim(), `en → ${key}`).not.toBe("");
    }
  });
});

describe("yer tutucular", () => {
  it("iki dilde de aynı değişkenleri kullanıyor", () => {
    /* `notices.deactivatedBody` içindeki `{name}` çeviride düşerse kullanıcının
       adı ekrandan kaybolur; fazladan bir `{foo}` ise next-intl'de çalışma
       zamanı hatası verir. İkisi de sessiz kalmamalı. */
    for (const key of trKeys) {
      const trValue = read(tr, key);
      const enValue = read(en, key);
      if (typeof trValue !== "string" || typeof enValue !== "string") continue;

      expect(placeholders(enValue), `${key}`).toEqual(placeholders(trValue));
    }
  });
});

describe("dil yapılandırması", () => {
  it("varsayılan dil desteklenen diller arasında", () => {
    expect(locales).toContain(defaultLocale);
  });

  it("her dilin bir etiketi var", () => {
    for (const locale of locales) {
      expect(LOCALE_LABELS[locale]?.trim()).toBeTruthy();
    }
  });

  it("tanınmayan değer varsayılana düşüyor", () => {
    /* Çerez elle düzenlenebilir; `?lang=klingon` benzeri bir değer bir hata
       sayfası değil, Türkçe arayüz üretmeli — `search-params.ts` başlığındaki
       ortak kuralın aynısı. */
    expect(toLocale("klingon")).toBe(defaultLocale);
    expect(toLocale(undefined)).toBe(defaultLocale);
    expect(toLocale(null)).toBe(defaultLocale);
    expect(toLocale("en")).toBe("en");
    expect(toLocale("tr")).toBe("tr");
  });
});

describe("ilan sözlüğü anahtarları karşılanıyor", () => {
  it("her kategori, durum ve sıralama anahtarının etiketi var", async () => {
    /* Faz 20'de `lib/listings.ts` yalnızca ANAHTAR taşımaya başladı; etiketler
       sözlüğe geçti. Yeni bir kategori eklenip çeviri yazılmazsa arayüzde
       "listings.category.foo" yazan bir rozet çıkardı — bu test onu yakalıyor.
       `config/navigation.ts` için yazılan denetimin aynısı. */
    const {
      LISTING_CATEGORIES,
      LISTING_STATUSES,
      SORT_KEYS,
      SORT_MESSAGE_KEY,
    } = await import("@/lib/listings");

    for (const category of LISTING_CATEGORIES) {
      expect(trKeys, `kategori: ${category}`).toContain(
        `listings.category.${category}`,
      );
    }

    for (const status of LISTING_STATUSES) {
      expect(trKeys, `durum: ${status}`).toContain(`listings.status.${status}`);
    }

    for (const key of SORT_KEYS) {
      expect(trKeys, `sıralama: ${key}`).toContain(
        `listings.sort.${SORT_MESSAGE_KEY[key]}`,
      );
    }
  });

  it("zod doğrulama anahtarlarının tamamı sözlükte", async () => {
    /* Şema fabrikası `ValidationKey` birliğiyle tiplenmiş, yani yanlış yazım
       derlemede yakalanıyor. Bu test tersini denetliyor: birlikte tanımlı ama
       sözlükte KARŞILIĞI OLMAYAN bir anahtar. */
    const keys = [
      "titleMin", "titleMax", "descriptionMin", "descriptionMax",
      "cityRequired", "districtRequired", "addressRequired", "agentRequired",
      "required", "numberOnly", "positive", "roomsRequired", "imagesRequired",
    ];

    for (const key of keys) {
      expect(trKeys, `doğrulama: ${key}`).toContain(`listings.validation.${key}`);
    }
  });

  it("aktivite kalıplarının hepsi tanımlı", async () => {
    const keys = [
      "listingCreated", "saleClosed", "offerReceived",
      "customerAdded", "appointmentScheduled",
    ];

    for (const key of keys) {
      expect(trKeys, `aktivite: ${key}`).toContain(
        `dashboard.activity.${key}`,
      );
    }
  });
});

describe("iş notu, evrak ve bildirim anahtarları karşılanıyor", () => {
  /**
   * ==========================================================================
   * PERÇİN TESTLERİ BİTTİ
   * ==========================================================================
   * Faz 20–22 boyunca burada bir "perçin" bloğu vardı: henüz çevrilmemiş
   * modüllerin Türkçe etiket sabitlerini sözlükle BİREBİR karşılaştırıyordu.
   * Gerekçesi geçici iki kaynaktı — çevrilmiş yüzeyler sözlükten, çevrilmemiş
   * sayfalar sabitten okuyordu.
   *
   * Faz 23'te son üç sabit de silindi (`WORK_NOTE_*_LABELS`,
   * `DOCUMENT_TYPE_LABELS`, `NOTIFICATION_TYPE_LABELS`), yani perçinlenecek
   * bir şey kalmadı. Soru değişti: artık "sabitle aynı mı" değil, "her
   * değerin iki dilde de bir metni var mı".
   */
  function expectKeys(prefix: string, keys: readonly string[]) {
    for (const key of keys) {
      expect(trKeys, `${prefix}.${key}`).toContain(`${prefix}.${key}`);
    }
  }

  it("iş notu türleri, ipuçları, durumları ve sekmeleri", async () => {
    const { WORK_NOTE_FILTERS, WORK_NOTE_TYPES } = await import(
      "@/lib/work-notes"
    );

    expectKeys("workNotes.type", WORK_NOTE_TYPES);
    expectKeys("workNotes.typeHint", WORK_NOTE_TYPES);
    expectKeys("workNotes.status", ["open", "resolved"]);
    expectKeys("workNotes.filter", WORK_NOTE_FILTERS);
  });

  it("pano boş durumlarının sekiz kombinasyonu da tanımlı", async () => {
    /* `emptyKey()` sekme × (başlık|gövde) üretiyor ve dönüş tipi şablon
       birliği olduğu için yazım hatası derlemede yakalanıyor. Bu test
       tersini denetliyor: üretilebilen ama sözlükte olmayan anahtar. */
    const { WORK_NOTE_FILTERS } = await import("@/lib/work-notes");

    for (const part of ["Title", "Body"]) {
      expectKeys("workNotes.empty", [`narrowed${part}`]);
      expectKeys(
        "workNotes.empty",
        WORK_NOTE_FILTERS.map((filter) => `${filter}${part}`),
      );
    }
  });

  it("evrak türleri", async () => {
    const { DOCUMENT_TYPES } = await import("@/lib/documents");
    expectKeys("documents.type", DOCUMENT_TYPES);
  });

  it("bildirim türleri", async () => {
    const { NOTIFICATION_TYPES } = await import("@/lib/notifications");
    expectKeys("notifications.type", NOTIFICATION_TYPES);
  });
});

describe("müşteri ve randevu anahtarları karşılanıyor", () => {
  /**
   * Faz 21'in denetimi. `lib/listings.ts` için yazılanın aynısı: sözlükte
   * karşılığı olmayan bir değer eklenirse arayüzde "customers.status.foo"
   * yazan bir rozet çıkardı.
   *
   * `trKeys` üzerinden bakmak yeterli — iki dilin anahtar eşitliği yukarıda
   * ayrıca test ediliyor, yani Türkçe'de varsa İngilizce'de de var.
   */
  function expectKeys(prefix: string, keys: readonly string[]) {
    for (const key of keys) {
      expect(trKeys, `${prefix}.${key}`).toContain(`${prefix}.${key}`);
    }
  }

  it("müşteri durumları, olayları, bütçe bantları ve sıralama", async () => {
    const {
      BUDGET_BANDS,
      CUSTOMER_EVENT_TYPES,
      CUSTOMER_SORT_KEYS,
      CUSTOMER_SORT_MESSAGE_KEY,
      CUSTOMER_STATUSES,
    } = await import("@/lib/customers");

    expectKeys("customers.status", CUSTOMER_STATUSES);
    expectKeys("customers.event", CUSTOMER_EVENT_TYPES);
    expectKeys(
      "customers.budget",
      BUDGET_BANDS.map((band) => band.key),
    );
    expectKeys(
      "customers.sort",
      CUSTOMER_SORT_KEYS.map((key) => CUSTOMER_SORT_MESSAGE_KEY[key]),
    );
  });

  it("müşteri zod doğrulama anahtarlarının tamamı sözlükte", () => {
    /* `listings.validation` için yazılan denetimin aynısı: fabrikanın
       `CustomerValidationKey` birliği yazımı derlemede yakalıyor, bu test ise
       tersini — birlikte tanımlı ama sözlükte KARŞILIĞI OLMAYAN anahtarı. */
    expectKeys("customers.validation", [
      "nameMin", "nameMax", "phoneMin", "phoneMax", "emailInvalid",
      "required", "numberOnly", "positive", "agentRequired", "notesMax",
      "budgetOrder", "budgetMinName", "budgetMaxName",
    ]);
  });

  it("randevu türleri, durumları ve takvim görünümleri", async () => {
    const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } = await import(
      "@/lib/appointments"
    );
    const { CALENDAR_VIEWS } = await import("@/lib/calendar");

    expectKeys("appointments.type", APPOINTMENT_TYPES);
    expectKeys("appointments.status", APPOINTMENT_STATUSES);
    /* Görünüm DEĞERLERİ Türkçe kalıyor (URL'de görünüyorlar) ama etiketleri
       çevriliyor — `lib/calendar.ts` başlığındaki ayrım. */
    expectKeys("appointments.view", CALENDAR_VIEWS);
  });
});

describe("server action hata kataloğu", () => {
  /**
   * ==========================================================================
   * FAZ 22'NİN BEKÇİSİ
   * ==========================================================================
   * `fail()` artık anahtar alıyor ve anahtarlar `result.ts` içinde bir TypeScript
   * birliği. Derleyici birlikte OLMAYAN bir anahtarı yakalıyor; bu test tersini
   * ve karşılığını yakalıyor:
   *
   *  · birlikte var ama sözlükte yok  → arayüzde "errors.actions.foo" yazan bir
   *    hata bildirimi,
   *  · sözlükte var ama birlikte yok  → ölü çeviri.
   *
   * Birlik KAYNAK DOSYADAN okunuyor: TypeScript tipleri çalışma zamanında yok
   * ve bu denetimi yapmanın tek yolu metni ayrıştırmak. Kırılgan görünüyor ama
   * kırıldığında sessiz kalmıyor — dosya bulunamazsa test düşer.
   */
  const source = readFileSync(
    new URL("../lib/actions/result.ts", import.meta.url),
    "utf8",
  );

  const union = source
    .split("export type ActionErrorKey =")[1]
    ?.split(";")[0] ?? "";

  const unionKeys = [...union.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

  const catalogKeys = Object.keys(
    (tr.errors as { actions: Record<string, string> }).actions,
  );

  it("birlik gerçekten ayrıştırılabildi", () => {
    /* Bu olmadan aşağıdaki iki test boş dizilerle sessizce geçerdi. */
    expect(unionKeys.length).toBeGreaterThan(50);
  });

  it("her anahtarın iki dilde de karşılığı var", () => {
    for (const key of unionKeys) {
      expect(trKeys, `tr → ${key}`).toContain(`errors.actions.${key}`);
      expect(enKeys, `en → ${key}`).toContain(`errors.actions.${key}`);
    }
  });

  it("sözlükte ölü anahtar yok", () => {
    expect(catalogKeys.filter((key) => !unionKeys.includes(key))).toEqual([]);
  });

  it("geçiş kurallarının ürettiği anahtarlar katalogda", async () => {
    /* Saf katman (`lib/offers.ts`, `lib/appointments.ts`, `lib/revenue.ts`)
       `ActionErrorKey` döndürüyor ama `fail`i çağırmıyor — bu üçü derleme
       zamanında birbirine bağlı değil, o yüzden ayrıca denetleniyor. */
    for (const key of [
      "appointmentAlreadyInStatus",
      "appointmentTransitionNotAllowed",
      "offerAlreadyInStatus",
      "offerTerminal",
      "commissionAlreadyInStatus",
      "commissionTransitionNotAllowed",
    ]) {
      expect(unionKeys, key).toContain(key);
    }
  });

  it("durum etiketleri geçiş mesajları için sözlükte", async () => {
    /* Geçiş mesajı `{status}` taşıyor ve action onu ilgili modülün
       sözlüğünden çeviriyor. Anahtarlar Faz 22'de bu iş için eklendi;
       Faz 24'te modüllerin arayüzü de aynı anahtarları kullanmaya başladı,
       yani artık iki tüketicileri var. */
    const { OFFER_STATUSES } = await import("@/lib/offers");
    const { COMMISSION_STATUSES } = await import("@/lib/revenue");

    for (const status of OFFER_STATUSES) {
      expect(trKeys, `offers.status.${status}`).toContain(
        `offers.status.${status}`,
      );
    }
    for (const status of COMMISSION_STATUSES) {
      expect(trKeys, `revenue.commissionStatus.${status}`).toContain(
        `revenue.commissionStatus.${status}`,
      );
    }
  });
});

describe("satış, gelir ve rapor anahtarları karşılanıyor", () => {
  /** Faz 24 — `lib/listings.ts` için yazılan denetimin aynısı. */
  function expectKeys(prefix: string, keys: readonly string[]) {
    for (const key of keys) {
      expect(trKeys, `${prefix}.${key}`).toContain(`${prefix}.${key}`);
    }
  }

  it("teklif ve satış sıralama anahtarları", async () => {
    const { OFFER_SORT_KEYS, SALE_SORT_KEYS, SORT_MESSAGE_KEY } =
      await import("@/lib/offers");

    expectKeys(
      "offers.sort",
      OFFER_SORT_KEYS.map((key) => SORT_MESSAGE_KEY[key]),
    );
    expectKeys(
      "sales.sort",
      SALE_SORT_KEYS.map((key) => SORT_MESSAGE_KEY[key]),
    );
  });

  it("dönem seçeneklerinin hepsi sözlükte", async () => {
    /* Anahtar olarak gün sayısının kendisi kullanılıyor ("30", "90", …).
       Yeni bir dönem eklenip çeviri yazılmazsa sekmede "revenue.period.7"
       yazardı. */
    const { PERIOD_OPTIONS } = await import("@/lib/revenue");
    expectKeys(
      "revenue.period",
      PERIOD_OPTIONS.map((option) => option.value),
    );
  });

  it("satış ve teklif sekmelerinin etiketi var", () => {
    expectKeys("sales.tabs", ["sales", "offers"]);
  });

  it("selamlamanın dört dönemi de sözlükte", async () => {
    /* Faz 27. Dönem anahtarı `lib/greeting.ts` içinde üretiliyor ve doğrudan
       `t()`ye veriliyor; karşılığı olmayan bir dönem eklenirse dashboard
       başlığında "dashboard.greeting.noon" yazardı. */
    const { GREETING_PERIODS } = await import("@/lib/greeting");
    expectKeys("dashboard.greeting", GREETING_PERIODS);
  });
});

describe("personel, ayar ve profil anahtarları karşılanıyor", () => {
  /**
   * ==========================================================================
   * FAZ 25 — SERİNİN SON DENETİMİ
   * ==========================================================================
   * Önceki fazlardakiyle aynı kurgu: saf katmandaki değer listeleri sözlükle
   * karşılaştırılıyor. Yeni olan, artık ARAYÜZ DIŞI iki katalogun da burada
   * denetlenmesi — yükleme ve giriş hataları. İkisi de `ActionErrorKey` gibi
   * TypeScript birliği ve ikisi de sözlükten okunuyor; birlik kaynak dosyadan
   * ayrıştırılıyor çünkü tipler çalışma zamanında yok.
   */
  function expectKeys(prefix: string, keys: readonly string[]) {
    for (const key of keys) {
      expect(trKeys, `${prefix}.${key}`).toContain(`${prefix}.${key}`);
    }
  }

  /** `export type X = "a" | "b";` gövdesindeki dizeleri toplar. */
  function unionOf(file: string, name: string): string[] {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const body = source.split(`export type ${name} =`)[1]?.split(";")[0] ?? "";
    return [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  }

  it("yetki rollerinin etiketi var", async () => {
    /* DEĞERLER Türkçe kalıyor (Postgres enum'u), etiketler çevriliyor —
       takvim görünümleriyle aynı ayrım. */
    const { AGENT_ROLES } = await import("@/lib/agents");
    expectKeys("agents.role", AGENT_ROLES);
  });

  it("her rozetin adı ve açıklaması var", async () => {
    /* `computeBadges` yalnızca kimlik döndürüyor; metin sözlükte. Yeni bir
       rozet eklenip çeviri yazılmazsa profilde "agents.badges.item.foo.label"
       yazan bir kutu çıkardı. */
    const { computeBadges } = await import("@/lib/badges");
    const ids = computeBadges({
      agentId: "agt-1",
      activeCustomers: 0,
      totalCustomers: 0,
      activeListings: 0,
      totalListings: 0,
      monthlySales: 0,
      monthlyRevenue: 0,
      monthlyCommission: 0,
      totalRevenue: 0,
      totalSales: 0,
    }).map((badge) => badge.id);

    expect(ids.length).toBeGreaterThan(0);
    expectKeys(
      "agents.badges.item",
      ids.flatMap((id) => [`${id}.label`, `${id}.description`]),
    );
  });

  it("bildirim tercihi satırlarının etiketi ve açıklaması var", async () => {
    const { NOTIFICATION_PREFERENCE_TYPES } = await import(
      "@/lib/notification-preferences"
    );
    expectKeys(
      "settings.notifications.type",
      NOTIFICATION_PREFERENCE_TYPES.flatMap((type) => [
        `${type}.label`,
        `${type}.description`,
      ]),
    );
  });

  it("yükleme hata anahtarlarının tamamı sözlükte", () => {
    const keys = unionOf("../lib/storage/upload.ts", "UploadErrorKey");
    expect(keys.length).toBeGreaterThan(5);
    expectKeys("upload.errors", keys);
  });

  it("giriş hata anahtarlarının tamamı sözlükte", () => {
    const keys = unionOf("../lib/auth/client.ts", "AuthErrorKey");
    expect(keys.length).toBeGreaterThan(3);
    expectKeys("auth.errors", keys);
  });
});

describe("menü anahtarları sözlükte karşılanıyor", () => {
  it("her nav öğesinin etiketi ve açıklaması var", async () => {
    /* `config/navigation.ts` artık yalnızca anahtar taşıyor. Bir öğe eklenip
       sözlüğe yazılmazsa arayüzde "nav.foo.label" yazan bir menü satırı
       çıkardı — bu test onu derleme sonrası ilk çalıştırmada yakalıyor. */
    const { navigation } = await import("@/config/navigation");

    for (const group of navigation) {
      expect(trKeys, `grup: ${group.key}`).toContain(
        `nav.groups.${group.key}`,
      );

      for (const item of group.items) {
        expect(trKeys, `öğe: ${item.key}`).toContain(`nav.${item.key}.label`);
        expect(trKeys, `öğe: ${item.key}`).toContain(
          `nav.${item.key}.description`,
        );
      }
    }
  });
});
