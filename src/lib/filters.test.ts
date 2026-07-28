import { describe, expect, it } from "vitest";

import {
  oneOf,
  positiveNumber,
  single,
  swapIfInverted,
} from "@/lib/search-params";
import {
  countActiveCustomerFilters,
  parseCustomerFilters,
} from "@/lib/customers-filters";
import {
  countActiveOfferFilters,
  countActiveSaleFilters,
  parseOfferFilters,
  parseSaleFilters,
} from "@/lib/sales-filters";

/**
 * URL filtre ayrıştırıcıları.
 *
 * ORTAK KURAL: BOZUK PARAMETRE FİLTREYİ DÜŞÜRMEZ. Elle düzenlenmiş ya da eski
 * bir link hata sayfası değil, yok sayılmış bir filtre üretmeli. Kullanıcı
 * adres çubuğuna ne yazarsa yazsın uygulama ayakta kalmalı — testlerin çoğu
 * bunun için.
 *
 * NOT: `use-filter-params` hook'unun kendisi burada DEĞİL. O bir React hook'u;
 * router ve `useSearchParams` sahtelemesi ister, yani jsdom + React test
 * ortamı gerektirir. Saf olan kısım — parametrelerin filtre nesnesine
 * çevrilmesi — burada; kapsam gerekçesi README > "Test kapsamı".
 */

describe("search-params yardımcıları", () => {
  it("single, dizi verilirse ilkini alır", () => {
    expect(single({ q: ["a", "b"] }, "q")).toBe("a");
    expect(single({ q: "tek" }, "q")).toBe("tek");
  });

  it("single, boş ve eksik değerde undefined döner", () => {
    expect(single({ q: "" }, "q")).toBeUndefined();
    expect(single({}, "q")).toBeUndefined();
    expect(single({ q: [] }, "q")).toBeUndefined();
  });

  it("positiveNumber negatif ve sayı olmayanı eler", () => {
    expect(positiveNumber({ n: "42" }, "n")).toBe(42);
    expect(positiveNumber({ n: "0" }, "n")).toBe(0);
    expect(positiveNumber({ n: "-1" }, "n")).toBeUndefined();
    expect(positiveNumber({ n: "abc" }, "n")).toBeUndefined();
    expect(positiveNumber({ n: "Infinity" }, "n")).toBeUndefined();
  });

  it("oneOf izin verilmeyen değeri yok sayar", () => {
    const allowed = ["aktif", "pasif"] as const;
    expect(oneOf({ s: "aktif" }, "s", allowed)).toBe("aktif");
    expect(oneOf({ s: "silinmis" }, "s", allowed)).toBeUndefined();
    expect(oneOf({}, "s", allowed)).toBeUndefined();
  });

  it("swapIfInverted ters aralığı düzeltir", () => {
    expect(swapIfInverted(10, 5)).toEqual([5, 10]);
    expect(swapIfInverted(5, 10)).toEqual([5, 10]);
    expect(swapIfInverted(undefined, 10)).toEqual([undefined, 10]);
    expect(swapIfInverted(5, undefined)).toEqual([5, undefined]);
  });
});

describe("parseCustomerFilters", () => {
  it("tanınan parametreleri okur", () => {
    const filters = parseCustomerFilters({
      q: "zeynep",
      status: "sicak",
      agent: "agt-1",
      minBudget: "5000000",
      maxBudget: "10000000",
      sort: "name",
    });

    expect(filters).toEqual({
      search: "zeynep",
      status: "sicak",
      agent: "agt-1",
      minBudget: 5_000_000,
      maxBudget: 10_000_000,
      sort: "name",
    });
  });

  it("ters bütçe aralığını düzeltir", () => {
    const filters = parseCustomerFilters({
      minBudget: "10000000",
      maxBudget: "5000000",
    });
    expect(filters.minBudget).toBe(5_000_000);
    expect(filters.maxBudget).toBe(10_000_000);
  });

  it("bozuk durum ve sıralamayı yok sayar, hata vermez", () => {
    const filters = parseCustomerFilters({ status: "kizgin", sort: "rastgele" });
    expect(filters.status).toBeUndefined();
    expect(filters.sort).toBeUndefined();
  });

  it("geçersiz danışman kimliği hata değil, boş sonuç üretir", () => {
    /* Liste veritabanında ve bu fonksiyon senkron; doğrulama yapılmıyor. */
    expect(parseCustomerFilters({ agent: "yok-boyle-biri" }).agent).toBe(
      "yok-boyle-biri",
    );
  });

  it("boş parametrelerle tüm alanlar undefined", () => {
    expect(parseCustomerFilters({})).toEqual({
      search: undefined,
      status: undefined,
      agent: undefined,
      minBudget: undefined,
      maxBudget: undefined,
      sort: undefined,
    });
  });

  it("etkin filtre sayımında bütçe tek filtre sayılır", () => {
    expect(
      countActiveCustomerFilters({ minBudget: "1", maxBudget: "2" }),
    ).toBe(1);
    expect(
      countActiveCustomerFilters({ q: "a", status: "sicak", minBudget: "1" }),
    ).toBe(3);
    expect(countActiveCustomerFilters({})).toBe(0);
  });
});

describe("parseSaleFilters", () => {
  it("geçerli tarih aralığını okur", () => {
    const filters = parseSaleFilters({
      from: "2026-01-01",
      to: "2026-07-31",
      agent: "agt-2",
    });
    expect(filters.from).toBe("2026-01-01");
    expect(filters.to).toBe("2026-07-31");
    expect(filters.agent).toBe("agt-2");
  });

  it("ters tarih aralığını düzeltir", () => {
    const filters = parseSaleFilters({ from: "2026-07-31", to: "2026-01-01" });
    expect(filters.from).toBe("2026-01-01");
    expect(filters.to).toBe("2026-07-31");
  });

  it("biçimi bozuk tarihi yok sayar", () => {
    expect(parseSaleFilters({ from: "01.01.2026" }).from).toBeUndefined();
    expect(parseSaleFilters({ from: "2026-1-1" }).from).toBeUndefined();
    expect(parseSaleFilters({ from: "bugün" }).from).toBeUndefined();
  });

  it("var olmayan takvim gününü yok sayar", () => {
    /* `new Date("2026-02-31")` sessizce 3 Mart'a kayar; ayrıştırıcı geri
       çevirip karşılaştırdığı için bunu yakalıyor. */
    expect(parseSaleFilters({ from: "2026-02-31" }).from).toBeUndefined();
    expect(parseSaleFilters({ to: "2026-13-01" }).to).toBeUndefined();
  });

  it("artık yıl 29 Şubat'ı kabul eder", () => {
    expect(parseSaleFilters({ from: "2028-02-29" }).from).toBe("2028-02-29");
    expect(parseSaleFilters({ from: "2026-02-29" }).from).toBeUndefined();
  });

  it("etkin filtre sayımında tarih aralığı tek filtre sayılır", () => {
    expect(
      countActiveSaleFilters({ from: "2026-01-01", to: "2026-07-31" }),
    ).toBe(1);
    expect(
      countActiveSaleFilters({ from: "2026-01-01", agent: "agt-1" }),
    ).toBe(2);
    expect(countActiveSaleFilters({ from: "bozuk" })).toBe(0);
  });
});

describe("parseOfferFilters", () => {
  it("durum ve danışmanı okur", () => {
    expect(parseOfferFilters({ status: "pending", agent: "agt-3" })).toEqual({
      status: "pending",
      agent: "agt-3",
      sort: undefined,
    });
  });

  it("bilinmeyen durumu yok sayar", () => {
    expect(parseOfferFilters({ status: "belki" }).status).toBeUndefined();
  });

  it("sıralama seçeneğini doğrular", () => {
    expect(parseOfferFilters({ sort: "amount-desc" }).sort).toBe("amount-desc");
    expect(parseOfferFilters({ sort: "tutar" }).sort).toBeUndefined();
  });

  it("etkin filtre sayar", () => {
    expect(countActiveOfferFilters({ status: "pending" })).toBe(1);
    expect(countActiveOfferFilters({ status: "pending", agent: "agt-1" })).toBe(2);
    expect(countActiveOfferFilters({})).toBe(0);
  });
});
