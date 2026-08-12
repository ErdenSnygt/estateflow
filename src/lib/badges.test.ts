import { describe, expect, it } from "vitest";

import type { AgentPerformance } from "@/lib/data/agents";
import { computeBadges, earnedCount } from "@/lib/badges";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationEnabled,
  parseNotificationPreferences,
  serializeNotificationPreferences,
} from "@/lib/notification-preferences";

/** Sıfırdan bir performans; testler yalnızca ilgilendikleri alanı doldurur. */
function performance(overrides: Partial<AgentPerformance> = {}): AgentPerformance {
  return {
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
    ...overrides,
  };
}

describe("computeBadges", () => {
  it("yeni personelde hiçbiri kazanılmamış ama hepsi listede", () => {
    const badges = computeBadges(performance());
    expect(badges).toHaveLength(5);
    expect(earnedCount(badges)).toBe(0);
    /* Kazanılmayanlar gizlenmiyor: neyin mümkün olduğu görünsün. İki ilerleme
       biçimi var — eşik rozetlerinde "3 / 20", ciro rozetinde yüzde
       (gerekçe `lib/badges.ts` içinde). */
    expect(
      badges.every(
        (badge) =>
          badge.progress !== undefined || badge.progressRatio !== undefined,
      ),
    ).toBe(true);
  });

  it("tek satış 'firstSale' rozetini açar, 'fiveSales'ı açmaz", () => {
    const badges = computeBadges(performance({ totalSales: 1 }));
    expect(badges.find((badge) => badge.id === "firstSale")?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === "fiveSales")?.earned).toBe(false);
  });

  it("eşiğe tam ulaşmak yeterli (>=, > değil)", () => {
    const badges = computeBadges(performance({ totalListings: 10 }));
    expect(badges.find((badge) => badge.id === "tenListings")?.earned).toBe(true);
  });

  it("kazanılan rozette ilerleme metni gösterilmiyor", () => {
    const badges = computeBadges(performance({ totalSales: 9 }));
    const first = badges.find((badge) => badge.id === "firstSale");
    expect(first?.earned).toBe(true);
    expect(first?.progress).toBeUndefined();
  });

  it("ilerleme metni mevcut/hedef biçiminde", () => {
    const badges = computeBadges(performance({ totalCustomers: 7 }));
    expect(badges.find((badge) => badge.id === "twentyCustomers")?.progress).toBe(
      "7 / 20",
    );
  });

  it("ciro rozeti yüzdeyle ilerliyor ve 100'e yuvarlanmıyor", () => {
    /* 0.99'da kalması önemli: hedefe ulaşmadan "%100" göstermek yalan olurdu.
       Faz 25: değer artık ORAN — `Intl`in yüzde biçimi oran bekliyor ve hem
       ondalık ayracını hem işaretin yerini kendisi çözüyor
       ("%99" · "99%"). Biçimlendirme `i18n/numbers.ts` içinde. */
    const badges = computeBadges(performance({ totalRevenue: 9_999_999 }));
    const revenue = badges.find((badge) => badge.id === "tenMillionRevenue");
    expect(revenue?.earned).toBe(false);
    expect(revenue?.progressRatio).toBe(0.99);
  });

  it("ciro eşiği aşılınca rozet açılıyor", () => {
    const badges = computeBadges(performance({ totalRevenue: 10_000_000 }));
    expect(
      badges.find((badge) => badge.id === "tenMillionRevenue")?.earned,
    ).toBe(true);
  });

  it("kazanılanlar listenin başına alınıyor", () => {
    const badges = computeBadges(
      performance({ totalSales: 1, totalRevenue: 20_000_000 }),
    );
    const earned = badges.filter((badge) => badge.earned).length;
    /* İlk `earned` öğenin hepsi kazanılmış olmalı. */
    expect(badges.slice(0, earned).every((badge) => badge.earned)).toBe(true);
    expect(badges.slice(earned).every((badge) => !badge.earned)).toBe(true);
  });

  it("rozet kimlikleri benzersiz", () => {
    const ids = computeBadges(performance()).map((badge) => badge.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("parseNotificationPreferences", () => {
  it("null / bozuk değerde hepsi açık", () => {
    /* YÖN ÖNEMLİ: bilinmeyen veri bildirimi SUSTURMUYOR. Eksik bildirim fark
       edilmez, fazladan bildirim edilir (`notification-preferences.ts`). */
    expect(parseNotificationPreferences(null)).toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
    expect(parseNotificationPreferences("metin")).toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
    expect(parseNotificationPreferences([1, 2])).toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
  });

  it("yalnızca açık `false` kapatıyor", () => {
    const parsed = parseNotificationPreferences({
      sale_closed: false,
      work_note_mention: true,
    });
    expect(parsed.sale_closed).toBe(false);
    expect(parsed.work_note_mention).toBe(true);
    /* Hiç bahsedilmeyen tür açık kalıyor. */
    expect(parsed.customer_added).toBe(true);
  });

  it("`false` dışındaki yanlış tipler kapatmıyor", () => {
    const parsed = parseNotificationPreferences({
      sale_closed: 0,
      customer_added: "hayır",
      listing_created: null,
    });
    expect(parsed.sale_closed).toBe(true);
    expect(parsed.customer_added).toBe(true);
    expect(parsed.listing_created).toBe(true);
  });

  it("eksik anahtarları varsayılana tamamlıyor", () => {
    const parsed = parseNotificationPreferences({ sale_closed: false });
    expect(Object.keys(parsed).sort()).toEqual(
      Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).sort(),
    );
  });
});

describe("serializeNotificationPreferences", () => {
  it("bilinmeyen anahtarları düşürüyor", () => {
    /* jsonb şemasız: temizlik burada yapılmazsa hiçbir yerde yapılmaz. */
    const result = serializeNotificationPreferences({
      sale_closed: false,
      // @ts-expect-error — istemciden gelen uydurma alan
      uydurma_alan: true,
    });
    expect(result).not.toHaveProperty("uydurma_alan");
    expect(Object.keys(result).sort()).toEqual(
      Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).sort(),
    );
  });

  it("boş girdide hepsi açık", () => {
    expect(serializeNotificationPreferences({})).toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
  });

  it("çözümleme ve serileştirme birbirinin tersi", () => {
    const original = { ...DEFAULT_NOTIFICATION_PREFERENCES, work_note_mention: false };
    expect(
      parseNotificationPreferences(serializeNotificationPreferences(original)),
    ).toEqual(original);
  });
});

describe("isNotificationEnabled", () => {
  it("notify() bu cevaba göre satır açıyor", () => {
    expect(isNotificationEnabled({ sale_closed: false }, "sale_closed")).toBe(
      false,
    );
    expect(isNotificationEnabled({ sale_closed: false }, "customer_added")).toBe(
      true,
    );
    expect(isNotificationEnabled(null, "work_note_mention")).toBe(true);
  });
});
