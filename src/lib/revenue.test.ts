import { describe, expect, it } from "vitest";

import {
  COMMISSION_STATUSES,
  DEFAULT_PERIOD,
  PERIOD_OPTIONS,
  availableCommissionTransitions,
  canTransitionCommission,
  commissionFor,
  emptyTotals,
  periodDays,
  periodValue,
  sumCommissions,
} from "@/lib/revenue";

describe("commissionFor", () => {
  it("bedel × oran, tam sayıya yuvarlanmış", () => {
    expect(commissionFor(10_000_000, 0.025)).toBe(250_000);
    expect(commissionFor(1_234_567, 0.03)).toBe(37_037);
  });

  it("bozuk girdide 0 döner", () => {
    /* Prim oranı okunamayan bir danışmanda (silinmiş kayıt) sayfa
       çökmemeli — `NaN` bütün toplamları zehirlerdi. */
    expect(commissionFor(Number.NaN, 0.02)).toBe(0);
    expect(commissionFor(1_000_000, Number.NaN)).toBe(0);
    expect(commissionFor(Number.POSITIVE_INFINITY, 0.02)).toBe(0);
  });

  it("sıfır oran sıfır komisyon", () => {
    expect(commissionFor(5_000_000, 0)).toBe(0);
  });
});

describe("sumCommissions", () => {
  it("duruma göre ayırıp toplar", () => {
    const totals = sumCommissions([
      { commission: 100, commission_status: "collected" },
      { commission: 200, commission_status: "pending" },
      { commission: 300, commission_status: "overdue" },
      { commission: 400, commission_status: "collected" },
    ]);

    expect(totals.total).toBe(1000);
    expect(totals.collected).toBe(500);
    expect(totals.pending).toBe(200);
    expect(totals.overdue).toBe(300);
    expect(totals.collectionRate).toBe(0.5);
  });

  it("boş listede sıfıra bölme yok", () => {
    expect(sumCommissions([])).toEqual(emptyTotals());
    expect(sumCommissions([]).collectionRate).toBe(0);
  });

  it("hepsi tahsil edilmişse oran 1", () => {
    const totals = sumCommissions([
      { commission: 50, commission_status: "collected" },
      { commission: 50, commission_status: "collected" },
    ]);
    expect(totals.collectionRate).toBe(1);
  });

  it("parçaların toplamı bütüne eşit", () => {
    /* Özet kartları ile döküm satırları aynı hesaptan besleniyor; bu
       değişmez bozulursa iki yer birbirini yalanlar. */
    const totals = sumCommissions([
      { commission: 13, commission_status: "collected" },
      { commission: 27, commission_status: "pending" },
      { commission: 41, commission_status: "overdue" },
    ]);
    expect(totals.collected + totals.pending + totals.overdue).toBe(
      totals.total,
    );
  });
});

describe("canTransitionCommission", () => {
  it("bekleyen komisyon tahsil edilebilir ya da geciktirilebilir", () => {
    expect(canTransitionCommission("pending", "collected").ok).toBe(true);
    expect(canTransitionCommission("pending", "overdue").ok).toBe(true);
  });

  it("tahsil edilmiş komisyon geri alınabilir", () => {
    /* Teklif kabulünün aksine arkasında bir zincir yok; yanlış işaretleme
       düzeltilebilmeli. */
    expect(canTransitionCommission("collected", "pending").ok).toBe(true);
  });

  it("aynı duruma geçiş reddedilir", () => {
    const result = canTransitionCommission("collected", "collected");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("commissionAlreadyInStatus");
      expect(result.params).toEqual({ status: "collected" });
    }
  });

  it("tanımsız geçiş reddedilir", () => {
    expect(canTransitionCommission("collected", "overdue").ok).toBe(false);
  });

  it("sunulan her seçenek gerçekten geçerli bir geçiş", () => {
    /* Arayüz `availableCommissionTransitions` ile menü çiziyor; sunucu
       `canTransitionCommission` ile doğruluyor. İkisi aynı tablodan
       beslenmezse kullanıcı hata veren bir düğme görür. */
    for (const from of COMMISSION_STATUSES) {
      for (const to of availableCommissionTransitions(from)) {
        expect(canTransitionCommission(from, to).ok).toBe(true);
      }
    }
  });
});

describe("dönem seçimi", () => {
  it("geçerli değeri gün sayısına çevirir", () => {
    expect(periodDays("30")).toBe(30);
    expect(periodDays("365")).toBe(365);
  });

  it("geçersiz ya da eksik değerde varsayılana düşer", () => {
    /* `search-params.ts` kuralı: bozuk parametre hata değil, yok sayılır. */
    const fallback = PERIOD_OPTIONS.find(
      (option) => option.value === DEFAULT_PERIOD,
    )!.days;
    expect(periodDays(undefined)).toBe(fallback);
    expect(periodDays("uydurma")).toBe(fallback);
    expect(periodDays("")).toBe(fallback);
  });

  it("geçerli değeri kendine, geçersizi varsayılana çeviriyor", () => {
    /* `periodLabel` KALKTI — metin döndüren bir fonksiyon dili bilemez.
       Yerine gelen `periodValue` çeviri ANAHTARI üretmek için kullanılıyor
       ve aynı yedeğe düşme kuralını koruyor. */
    expect(periodValue("90")).toBe("90");
    expect(periodValue("uydurma")).toBe(DEFAULT_PERIOD);
    expect(periodValue(undefined)).toBe(DEFAULT_PERIOD);
  });

  it("seçenek değerleri benzersiz", () => {
    const values = PERIOD_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
