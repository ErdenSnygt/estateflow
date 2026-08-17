import { describe, expect, it } from "vitest";

import { GREETING_PERIODS, greetingPeriod } from "@/lib/greeting";

describe("selamlama dönemi", () => {
  it("sınırlar kapalı-açık: 11 öğleden sonraya ait, sabaha değil", () => {
    expect(greetingPeriod(10)).toBe("morning");
    expect(greetingPeriod(11)).toBe("afternoon");
    expect(greetingPeriod(17)).toBe("afternoon");
    expect(greetingPeriod(18)).toBe("evening");
    expect(greetingPeriod(21)).toBe("evening");
    expect(greetingPeriod(22)).toBe("night");
    expect(greetingPeriod(4)).toBe("night");
    expect(greetingPeriod(5)).toBe("morning");
  });

  it("gece yarısını aşan aralık kopmuyor", () => {
    /* `night` tek aralık değil: 22, 23, 0, 1, 2, 3, 4. Sıralı denetimin
       sonunda kalan kova olduğu için gece yarısında bir boşluk açılmamalı. */
    for (const hour of [22, 23, 0, 1, 2, 3, 4]) {
      expect(greetingPeriod(hour), String(hour)).toBe("night");
    }
  });

  it("24 saatin tamamı bir döneme düşüyor ve dördü de kullanılıyor", () => {
    const seen = new Set(
      Array.from({ length: 24 }, (_, hour) => greetingPeriod(hour)),
    );

    expect(seen.size).toBe(GREETING_PERIODS.length);
    for (const period of GREETING_PERIODS) {
      expect(seen.has(period), period).toBe(true);
    }
  });
});
