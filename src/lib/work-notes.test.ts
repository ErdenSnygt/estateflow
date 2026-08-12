import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORK_NOTE_FILTER,
  WORK_NOTE_FILTERS,
  WORK_NOTE_STATUS_TONES,
  WORK_NOTE_TYPES,
  WORK_NOTE_TYPE_TONES,
  canResolve,
  initialStatusFor,
  mentionToken,
  notePreview,
  parseWorkNoteQuery,
  withMention,
  withoutMention,
  workNoteHref,
} from "@/lib/work-notes";

/**
 * Faz 18'in saf fonksiyonları. Vitest kapsamı Faz 8'de çizildiği gibi:
 * veritabanı gerektirmeyen mantık test ediliyor, RLS ve sorgular değil.
 */

describe("initialStatusFor", () => {
  it("takip edilebilir türler açık doğuyor", () => {
    expect(initialStatusFor("question")).toBe("open");
    expect(initialStatusFor("assignment")).toBe("open");
  });

  it("genel notun durumu YOK", () => {
    /* Şemadaki `work_notes_status_matches_type` kısıtının aynası: bu fonksiyon
       `null` dönmeseydi insert veritabanı tarafından reddedilirdi. */
    expect(initialStatusFor("note")).toBeNull();
  });
});

describe("canResolve", () => {
  it("yalnızca açık not kapatılabilir", () => {
    expect(canResolve("open")).toBe(true);
    expect(canResolve("resolved")).toBe(false);
    /* Genel notta düğme hiç çizilmemeli. */
    expect(canResolve(null)).toBe(false);
  });
});

describe("parseWorkNoteQuery", () => {
  it("geçerli parametreleri okur", () => {
    expect(
      parseWorkNoteQuery({ f: "resolved", t: "assignment", q: "  tapu  " }),
    ).toEqual({ filter: "resolved", type: "assignment", search: "tapu" });
  });

  it("parametresiz istekte varsayılan sekme açılır", () => {
    expect(parseWorkNoteQuery({})).toEqual({
      filter: DEFAULT_WORK_NOTE_FILTER,
      type: undefined,
      search: undefined,
    });
  });

  it("tanınmayan sekme ve tür düşer", () => {
    /* Elle düzenlenmiş link hata sayfası değil, yok sayılmış bir filtre
       üretmeli — `search-params.ts` başlığındaki ortak kural. */
    const parsed = parseWorkNoteQuery({ f: "uydurma", t: "uydurma" });
    expect(parsed.filter).toBe(DEFAULT_WORK_NOTE_FILTER);
    expect(parsed.type).toBeUndefined();
  });

  it("yalnızca boşluktan oluşan aramayı düşürür", () => {
    expect(parseWorkNoteQuery({ q: "   " }).search).toBeUndefined();
  });

  it("aynı anahtar iki kez verilirse ilkini alır", () => {
    expect(parseWorkNoteQuery({ f: ["mine", "all"] }).filter).toBe("mine");
  });
});

describe("@mention jetonu", () => {
  it("boş kutuya jeton ve boşluk yazar", () => {
    expect(withMention("", "Mehmet Kaya")).toBe("@Mehmet Kaya ");
  });

  it("mevcut metnin başına ekler", () => {
    expect(withMention("evrakları aldın mı?", "Mehmet Kaya")).toBe(
      "@Mehmet Kaya evrakları aldın mı?",
    );
  });

  it("zaten varsa tekrar eklemez", () => {
    /* Kullanıcı seçimi değiştirmeden metni düzenlediğinde jeton ikiye
       katlanmamalı. */
    const once = withMention("evrak?", "Mehmet Kaya");
    expect(withMention(once, "Mehmet Kaya")).toBe(once);
  });

  it("söktüğünde geriye yalnızca metin kalır", () => {
    expect(withoutMention("@Mehmet Kaya evrak?", "Mehmet Kaya")).toBe("evrak?");
  });

  it("olmayan jetonu sökmeye çalışınca metne dokunmaz", () => {
    expect(withoutMention("evrak?", "Mehmet Kaya")).toBe("evrak?");
  });

  it("ad ve soyad arasındaki boşluk korunuyor", () => {
    /* Metin sorgulanmıyor, okunuyor: "@MehmetKaya" okunabilir değil. */
    expect(mentionToken("Mehmet Kaya")).toBe("@Mehmet Kaya");
  });
});

const LABELS = { image: "<gorsel>", file: "<dosya>" };

describe("notePreview", () => {
  it("metin varsa onu döner", () => {
    expect(notePreview("  Fiyatta esnek değil  ", null, LABELS)).toBe(
      "Fiyatta esnek değil",
    );
  });

  it("metinsiz ekte ekin türünü yazar", () => {
    /* Şema "ya metin ya ek" diyor, yani metinsiz not mümkün; boş satır
       göstermek yerine ekin varlığı yazılıyor.

       Faz 23: yedek etiketler artık DIŞARIDAN geliyor (çeviriden), o yüzden
       test kendi sahte etiketlerini veriyor ve dile bağımsız kaldı. */
    expect(notePreview("", "image", LABELS)).toBe("<gorsel>");
    expect(notePreview("   ", "file", LABELS)).toBe("<dosya>");
  });
});

describe("workNoteHref", () => {
  it("müşteriye bağlı not müşteriye gider", () => {
    expect(workNoteHref({ customer_id: "mus-1", listing_id: null })).toBe(
      "/musteriler/mus-1",
    );
  });

  it("ilana bağlı not ilana gider", () => {
    expect(workNoteHref({ customer_id: null, listing_id: "iln-2" })).toBe(
      "/ilanlar/iln-2",
    );
  });

  it("ikisi birden doluysa MÜŞTERİ kazanır", () => {
    /* Bir not tipik olarak bir kişiyle ilgili; ilan onun bağlamı. */
    expect(workNoteHref({ customer_id: "mus-1", listing_id: "iln-2" })).toBe(
      "/musteriler/mus-1",
    );
  });

  it("bağlamsız notta null döner", () => {
    /* Şema böyle bir satırı reddediyor (`work_notes_has_target`) ama
       fonksiyon yine de savunmalı: silinmiş bir kayıt kolonu boşaltabilir. */
    expect(workNoteHref({ customer_id: null, listing_id: null })).toBeNull();
  });
});

describe("yapı eksiksiz", () => {
  /* Faz 23: ETİKET denetimleri buradan kalktı — metinler sözlüğe taşındı ve
     "her türün bir etiketi var mı" sorusu artık `messages.test.ts` içinde,
     iki dil için birden soruluyor. Geriye YAPI denetimi kaldı. */

  it("her not türünün bir tonu var", () => {
    for (const type of WORK_NOTE_TYPES) {
      expect(WORK_NOTE_TYPE_TONES[type]).toBeTruthy();
    }
  });

  it("her durumun bir tonu var", () => {
    for (const status of ["open", "resolved"] as const) {
      expect(WORK_NOTE_STATUS_TONES[status]).toBeTruthy();
    }
  });

  it("dört sekme var ve varsayılan bunlardan biri", () => {
    expect(WORK_NOTE_FILTERS).toHaveLength(4);
    expect(WORK_NOTE_FILTERS).toContain(DEFAULT_WORK_NOTE_FILTER);
  });
});
