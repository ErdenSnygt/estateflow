import { describe, expect, it } from "vitest";

import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_TONES,
  MESSAGE_TEMPLATES,
  NOTIFICATION_TYPE_LABELS,
  attachmentKindFor,
  guessDocumentType,
  notificationHref,
  titleFromFileName,
} from "@/lib/messaging";
import { parseDocumentFilters } from "@/lib/documents-filters";

/**
 * Faz 12'nin saf fonksiyonları. Vitest kapsamı Faz 8'de çizildiği gibi:
 * veritabanı gerektirmeyen mantık test ediliyor, RLS ve sorgular değil.
 */

describe("guessDocumentType", () => {
  it("dosya adından tapu tanır", () => {
    expect(guessDocumentType("tapu_kadikoy.pdf")).toBe("tapu");
    expect(guessDocumentType("SENET-2026.pdf")).toBe("tapu");
  });

  it("kimlik belgelerini tanır", () => {
    expect(guessDocumentType("kimlik-on.jpg")).toBe("kimlik");
    expect(guessDocumentType("pasaport.png")).toBe("kimlik");
    expect(guessDocumentType("ehliyet_kopya.pdf")).toBe("kimlik");
  });

  it("sözleşmeyi Türkçe karakterli ve karaktersiz yazımda tanır", () => {
    expect(guessDocumentType("sozlesme.docx")).toBe("sozlesme");
    expect(guessDocumentType("Sözleşme Nihai.pdf")).toBe("sozlesme");
    expect(guessDocumentType("contract-final.pdf")).toBe("sozlesme");
  });

  it("tanımadığında genel kovaya düşer", () => {
    expect(guessDocumentType("belge.pdf")).toBe("pdf");
    expect(guessDocumentType("")).toBe("pdf");
  });

  it("büyük/küçük harf farkı gözetmez", () => {
    /* Türkçe'de "I" küçültülünce "ı" olur; `toLocaleLowerCase("tr-TR")`
       kullanılmasaydı "KİMLİK" eşleşmezdi. */
    expect(guessDocumentType("KİMLİK.PDF")).toBe("kimlik");
    expect(guessDocumentType("TAPU.PDF")).toBe("tapu");
  });
});

describe("titleFromFileName", () => {
  it("uzantıyı atar ve ayraçları boşluğa çevirir", () => {
    expect(titleFromFileName("tapu_kadikoy_daire.pdf")).toBe(
      "tapu kadikoy daire",
    );
    expect(titleFromFileName("sozlesme-2026-nihai.docx")).toBe(
      "sozlesme 2026 nihai",
    );
  });

  it("uzantısız adı olduğu gibi bırakır", () => {
    expect(titleFromFileName("belge")).toBe("belge");
  });

  it("adı tamamen eriyen dosyada dosya adına geri döner", () => {
    /* ".gitignore" gibi adlarda uzantı atıldığında geriye boş metin kalıyor;
       boş başlık kaydedilemez, o yüzden ham ad korunuyor. */
    expect(titleFromFileName(".gitignore")).toBe(".gitignore");
  });
});

describe("attachmentKindFor", () => {
  it("görselleri image, diğerlerini file sayar", () => {
    expect(attachmentKindFor("image/jpeg")).toBe("image");
    expect(attachmentKindFor("image/webp")).toBe("image");
    expect(attachmentKindFor("application/pdf")).toBe("file");
    expect(attachmentKindFor("application/msword")).toBe("file");
  });
});

describe("notificationHref", () => {
  it("her varlık türü için adres üretir", () => {
    expect(notificationHref("customer", "mus-1")).toBe("/musteriler/mus-1");
    expect(notificationHref("listing", "iln-1")).toBe("/ilanlar/iln-1");
    expect(notificationHref("sale", "iln-1")).toBe("/satislar");
    expect(notificationHref("conversation", "abc")).toBe("/mesajlar?k=abc");
    expect(notificationHref("appointment", "xyz")).toBe("/randevular");
  });

  it("eksik bağda null döner", () => {
    /* Polimorfik bağın bedeli: hedef silinmiş olabilir. Arayüz `null`
       görünce satırı tıklanamaz çiziyor — kırık linke tıklatıp 404
       göstermek yerine. */
    expect(notificationHref(null, "mus-1")).toBeNull();
    expect(notificationHref("customer", null)).toBeNull();
    expect(notificationHref(null, null)).toBeNull();
  });
});

describe("sözlükler eksiksiz", () => {
  it("her belge türünün etiketi ve tonu var", () => {
    for (const type of Object.keys(DOCUMENT_TYPE_LABELS)) {
      expect(DOCUMENT_TYPE_LABELS[type as never]).toBeTruthy();
      expect(DOCUMENT_TYPE_TONES[type as never]).toBeTruthy();
    }
  });

  it("beş bildirim türünün de etiketi var", () => {
    expect(Object.keys(NOTIFICATION_TYPE_LABELS)).toHaveLength(5);
  });

  it("şablonların kimliği benzersiz ve metni dolu", () => {
    const ids = MESSAGE_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of MESSAGE_TEMPLATES) {
      expect(template.text.trim().length).toBeGreaterThan(10);
    }
  });
});

describe("parseDocumentFilters", () => {
  it("geçerli parametreleri okur", () => {
    expect(
      parseDocumentFilters({
        type: "tapu",
        customer: "mus-1",
        listing: "iln-2",
        q: "kadıköy",
      }),
    ).toEqual({
      type: "tapu",
      customer: "mus-1",
      listing: "iln-2",
      search: "kadıköy",
    });
  });

  it("tanınmayan belge türünü düşürür", () => {
    /* Elle düzenlenmiş link hata sayfası değil, yok sayılmış bir filtre
       üretmeli — `search-params.ts` başlığındaki ortak kural. */
    expect(parseDocumentFilters({ type: "uydurma" }).type).toBeUndefined();
  });

  it("PostgREST'in ayraç saydığı karakterleri temizler", () => {
    /* Virgül ve parantez `ilike` şablonuna doğrudan girseydi sorgu bozulur
       ve 400 dönerdi (`data/query.ts`). */
    expect(parseDocumentFilters({ q: "tapu, (kopya)" }).search).toBe(
      "tapu   kopya",
    );
  });

  it("yalnızca ayraçtan oluşan aramayı düşürür", () => {
    expect(parseDocumentFilters({ q: ",,," }).search).toBeUndefined();
  });

  it("boş parametrelerde her alan undefined", () => {
    expect(parseDocumentFilters({})).toEqual({
      type: undefined,
      customer: undefined,
      listing: undefined,
      search: undefined,
    });
  });
});
