import { describe, expect, it } from "vitest";

import {
  createCustomerFormSchema,
  toCustomerInput,
  type CustomerFormValues,
} from "@/lib/customers-schema";
import {
  createListingFormSchema,
  toListingInput,
  type ListingFormValues,
} from "@/lib/listings-schema";

/**
 * Form şemaları.
 *
 * İki kural test ediliyor ve ikisi de projeye özgü kararlar:
 *
 *  1. SAYISAL ALANLAR STRING TUTULUR. `z.coerce` kullanılsaydı boş alan 0'a
 *     dönüşür ve "zorunludur" yerine "0'dan büyük olmalı" derdi — kullanıcı
 *     neyi yanlış yaptığını anlamazdı.
 *  2. `to…Input` dönüştürücüleri veritabanı sözleşmesini kuruyor: boş metin
 *     null'a çevriliyor, sayılar sayıya. Şema geçse bile bu adım bozulursa
 *     veritabanına yanlış tip gider.
 */

const validCustomer: CustomerFormValues = {
  full_name: "Zeynep Arslan",
  phone: "+90 532 000 00 00",
  email: "zeynep@example.com",
  budget_min: "5000000",
  budget_max: "10000000",
  status: "sicak",
  assigned_agent_id: "agt-1",
  notes: "Kadıköy tarafında 3+1 arıyor.",
};

/**
 * Müşteri şeması da Faz 21'de fabrikaya döndü; `listingFormSchema` ile aynı
 * gerekçeyle kimlik `t` kullanılıyor (aşağıdaki başlığa bakın): mesaj yerine
 * ANAHTAR dönüyor, testler dile bağımsız kalıyor.
 */
const customerFormSchema = createCustomerFormSchema((key) => key, {
  budgetMin: "budgetMinName",
  budgetMax: "budgetMaxName",
});

describe("customerFormSchema", () => {
  it("geçerli kaydı kabul eder", () => {
    expect(customerFormSchema.safeParse(validCustomer).success).toBe(true);
  });

  it("kısa ad soyadı reddeder", () => {
    const result = customerFormSchema.safeParse({
      ...validCustomer,
      full_name: "Ze",
    });
    expect(result.success).toBe(false);
  });

  it("geçersiz e-postayı reddeder", () => {
    expect(
      customerFormSchema.safeParse({ ...validCustomer, email: "zeynep" })
        .success,
    ).toBe(false);
  });

  it("boş bütçeye 'zorunludur' der, '0'dan büyük olmalı' demez", () => {
    /* `z.coerce` kullanılsaydı boş metin 0'a dönüşür ve yanlış mesaj çıkardı —
       bu testin asıl koruduğu şey o karar. */
    const result = customerFormSchema.safeParse({
      ...validCustomer,
      budget_min: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      /* Kimlik `t` yüzünden mesaj yerine ANAHTAR geliyor; asıl korunan şey
         "boş alan `required` üretir, `positive` değil" kuralı. */
      expect(result.error.issues[0].message).toBe("required");
    }
  });

  it("sayı olmayan bütçeyi reddeder", () => {
    expect(
      customerFormSchema.safeParse({ ...validCustomer, budget_min: "abc" })
        .success,
    ).toBe(false);
  });

  it("üst bütçe alt bütçeden küçükse alan bazlı hata verir", () => {
    /* Veritabanındaki `customers_budget_range` CHECK kısıtının arayüz
       karşılığı; burada yakalanmazsa kullanıcı ham Postgres hatası görürdü. */
    const result = customerFormSchema.safeParse({
      ...validCustomer,
      budget_min: "10000000",
      budget_max: "5000000",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["budget_max"]);
    }
  });

  it("şemada portre alanı YOK", () => {
    /* Faz 19: müşteri fotoğrafı kaldırıldı. Zod nesnesi bilinmeyen anahtarları
       sessizce düşürdüğü için gövdeye eklenen bir `avatar_url` doğrulamayı
       geçer ama çıktıya girmez — asıl güvence `toCustomerInput`ta ve orada
       ayrıca test ediliyor. */
    const parsed = customerFormSchema.safeParse({
      ...validCustomer,
      avatar_url: "https://cdn.example.com/a.webp",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "avatar_url" in parsed.data).toBe(false);
  });
});

describe("toCustomerInput", () => {
  it("sayısal alanları sayıya çevirir", () => {
    const input = toCustomerInput(validCustomer);
    expect(input.budget_min).toBe(5_000_000);
    expect(input.budget_max).toBe(10_000_000);
    expect(typeof input.budget_min).toBe("number");
  });

  it("portreyi her zaman null yazar", () => {
    /* Faz 19: müşteri fotoğrafı kaldırıldı. Formda alan yok, dönüştürücü de
       kolonu boş bırakıyor — arayüz her yerde baş harf gösteriyor
       (`components/customers/customer-avatar.tsx`). Bu test, ileride formda
       yanlışlıkla bir yükleme alanı geri gelirse uyarsın diye duruyor. */
    expect(toCustomerInput(validCustomer).avatar_url).toBeNull();
  });

  it("yeni kayıtta son görüşme tarihi null", () => {
    expect(toCustomerInput(validCustomer).last_contact_at).toBeNull();
  });
});

const validListing: ListingFormValues = {
  title: "Deniz Manzaralı 3+1 Daire",
  description: "Geniş balkonlu, güney cepheli.",
  category: "satilik",
  status: "aktif",
  city: "İstanbul",
  district: "Kadıköy",
  address: "Caferağa Mah. 1. Sok. No:1",
  agent_id: "agt-1",
  price: "12450000",
  currency: "TRY",
  area_sqm: "145",
  room_count: "3",
  images: ["https://cdn.example.com/1.webp"],
};

/**
 * ŞEMA ARTIK BİR FABRİKA (Faz 20): doğrulama mesajları çeviriden geliyor.
 * Test için gerçek sözlük yerine SAHTE bir çevirmen veriliyor — anahtarın
 * kendisini döndürüyor. Testlerin ilgilendiği şey mesajın metni değil, hangi
 * ALANIN reddedildiği; anahtar döndürmek bunu okunur da kılıyor
 * (`issues[0].message === "titleMin"`).
 *
 * Yan kazanç: testler dile bağımsız kalıyor. Bir çeviri metni düzeltildiğinde
 * burada hiçbir şey kırılmıyor.
 */
const listingFormSchema = createListingFormSchema((key) => key, {
  price: "Fiyat",
  area: "Alan",
});

describe("listingFormSchema", () => {
  it("geçerli ilanı kabul eder", () => {
    expect(listingFormSchema.safeParse(validListing).success).toBe(true);
  });

  it("boş başlığı reddeder", () => {
    expect(
      listingFormSchema.safeParse({ ...validListing, title: "" }).success,
    ).toBe(false);
  });

  it("aktif ilan görselsiz olamaz", () => {
    /* Yayına alınan bir ilanın kapak görseli olmalı; taslakta serbest. */
    const result = listingFormSchema.safeParse({ ...validListing, images: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["images"]);
    }
  });

  it("taslak ilan görselsiz kaydedilebilir", () => {
    expect(
      listingFormSchema.safeParse({
        ...validListing,
        status: "taslak",
        images: [],
      }).success,
    ).toBe(true);
  });

  it("sayı olmayan fiyatı reddeder", () => {
    expect(
      listingFormSchema.safeParse({ ...validListing, price: "çok" }).success,
    ).toBe(false);
  });
});

describe("toListingInput", () => {
  it("fiyat ve alanı sayıya çevirir", () => {
    const input = toListingInput(validListing);
    expect(input.price).toBe(12_450_000);
    expect(input.area_sqm).toBe(145);
  });

  it("oda sayısı boşsa 0 olur (konut dışı ilanlar)", () => {
    /* Arsa ve ofiste oda alanı formda hiç gösterilmiyor; 0 "konut değil"
       anlamına geliyor. */
    const input = toListingInput({
      ...validListing,
      category: "arsa",
      room_count: "",
    });
    expect(input.room_count).toBe(0);
  });

  it("görsel listesini olduğu gibi taşır", () => {
    expect(toListingInput(validListing).images).toEqual(validListing.images);
  });
});
