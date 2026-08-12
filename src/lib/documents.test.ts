import { describe, expect, it } from "vitest";

import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_TONES,
  attachmentKindFor,
  guessDocumentType,
  titleFromFileName,
} from "@/lib/documents";
import {
  NOTIFICATION_TYPES,
  notificationHref,
} from "@/lib/notifications";
import { parseDocumentFilters } from "@/lib/documents-filters";

/**
 * Faz 12'nin saf fonksiyonları.
 *
 * Dosya Faz 18'de `messaging.test.ts`ten devraldı: `lib/messaging.ts` üçe
 * bölündü (evrak / bildirim / iş notu) ve testleri de öyle. İş notlarının
 * kendi dosyası var — `work-notes.test.ts`.
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
    expect(notificationHref("appointment", "xyz")).toBe("/randevular");
  });

  it("iş notu, panoda o notu vurgulayan adrese gider", () => {
    /* Notun tek başına bir detay sayfası YOK ve olmamalı — bir not, bağlamı
       olmadan okunacak bir şey değil (`0012_work_notes.sql`). Bildirim bu
       yüzden panoya, "Tüm ekip" sekmesine ve `?n=` vurgusuna gidiyor. */
    expect(notificationHref("work_note", "abc")).toBe("/mesajlar?f=all&n=abc");
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

describe("yapı eksiksiz", () => {
  /* Faz 23: etiket denetimleri `messages.test.ts`e taşındı (iki dil için
     birden). Burada yalnızca yapı kaldı. */

  it("her belge türünün bir tonu var", () => {
    for (const type of DOCUMENT_TYPES) {
      expect(DOCUMENT_TYPE_TONES[type]).toBeTruthy();
    }
  });

  it("yedi bildirim türü var", () => {
    /* Faz 18'de `message_received` kalktı, üç iş notu türü geldi: 5 → 7. */
    expect(NOTIFICATION_TYPES).toHaveLength(7);
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
