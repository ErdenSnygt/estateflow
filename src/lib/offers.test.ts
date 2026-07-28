import { describe, expect, it } from "vitest";

import type { OfferStatus } from "@/types/database";
import {
  availableTransitions,
  canTransition,
  closesSale,
  isTerminal,
  OFFER_STATUS_LABELS,
} from "@/lib/offers";

/**
 * Faz 8'de yazılan teklif→satış geçiş mantığı.
 *
 * Bu kurallar iki yerden birden okunuyor: arayüz hangi düğmeleri çizeceğine,
 * server action geçişin geçerli olup olmadığına buradan karar veriyor. İkisi
 * ayrışırsa kullanıcı tıklayınca hata veren bir düğme görür — testin asıl
 * koruduğu şey bu.
 */

const ALL: OfferStatus[] = ["pending", "accepted", "rejected", "expired"];
const TERMINAL: OfferStatus[] = ["accepted", "rejected", "expired"];

describe("canTransition", () => {
  it("bekleyen teklif üç sonuca da gidebilir", () => {
    for (const target of TERMINAL) {
      expect(canTransition("pending", target)).toEqual({ ok: true });
    }
  });

  it("terminal durumdan hiçbir yere gidilemez", () => {
    for (const from of TERMINAL) {
      for (const to of ALL) {
        expect(canTransition(from, to).ok).toBe(false);
      }
    }
  });

  it("aynı duruma geçiş reddedilir", () => {
    for (const status of ALL) {
      const result = canTransition(status, status);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        /* Mesaj kullanıcıya gösteriliyor; "zaten" ifadesi aynı-duruma-geçiş
           halini diğer redlerden ayırıyor. */
        expect(result.reason).toContain("zaten");
      }
    }
  });

  it("red gerekçesi kullanıcıya gösterilebilir bir cümle", () => {
    const result = canTransition("accepted", "rejected");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain(OFFER_STATUS_LABELS.accepted);
      expect(result.reason.length).toBeGreaterThan(10);
    }
  });

  it("pending → pending, terminal geçişlerden farklı gerekçe verir", () => {
    const same = canTransition("pending", "pending");
    const terminal = canTransition("rejected", "accepted");
    expect(same.ok).toBe(false);
    expect(terminal.ok).toBe(false);
    if (!same.ok && !terminal.ok) {
      expect(same.reason).not.toBe(terminal.reason);
    }
  });
});

describe("availableTransitions", () => {
  it("bekleyen teklifte üç aksiyon sunulur", () => {
    expect(availableTransitions("pending").sort()).toEqual(
      ["accepted", "expired", "rejected"].sort(),
    );
  });

  it("terminal durumda hiç aksiyon sunulmaz", () => {
    for (const status of TERMINAL) {
      expect(availableTransitions(status)).toEqual([]);
    }
  });

  it("dönen dizi değiştirilse bile kural tablosu bozulmaz", () => {
    const first = availableTransitions("pending");
    first.push("pending");
    expect(availableTransitions("pending")).toHaveLength(3);
  });

  it("sunulan her aksiyon gerçekten geçerli bir geçiştir", () => {
    /* Arayüz ile sunucunun aynı kaynağa baktığının kanıtı: düğme çıkıyorsa
       `canTransition` da evet demeli. */
    for (const from of ALL) {
      for (const to of availableTransitions(from)) {
        expect(canTransition(from, to)).toEqual({ ok: true });
      }
    }
  });
});

describe("isTerminal", () => {
  it("yalnızca pending terminal değildir", () => {
    expect(isTerminal("pending")).toBe(false);
    for (const status of TERMINAL) {
      expect(isTerminal(status)).toBe(true);
    }
  });
});

describe("closesSale", () => {
  it("yalnızca kabul satışı kapatır", () => {
    expect(closesSale("accepted")).toBe(true);
    expect(closesSale("rejected")).toBe(false);
    expect(closesSale("expired")).toBe(false);
    expect(closesSale("pending")).toBe(false);
  });
});

describe("etiket sözlüğü", () => {
  it("her durumun bir etiketi var", () => {
    for (const status of ALL) {
      expect(OFFER_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});
