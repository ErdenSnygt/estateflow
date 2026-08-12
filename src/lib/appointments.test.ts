import { describe, expect, it } from "vitest";

import type { AppointmentStatus, AppointmentType } from "@/types/database";
import { CUSTOMER_EVENT_TYPES } from "@/lib/customers";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_PALETTE,
  appointmentTitle,
  availableTransitions,
  canTransition,
  isReschedulable,
  timelineDescription,
  timelineEventFor,
} from "@/lib/appointments";

const TYPES: readonly AppointmentType[] = APPOINTMENT_TYPES;
const STATUSES: readonly AppointmentStatus[] = APPOINTMENT_STATUSES;

describe("kategori sözlüğü", () => {
  it("her tür için renk var", () => {
    /* Etiket denetimi buradan KALKTI: Faz 21'de metinler sözlüğe taşındı ve
       "her tür için etiket var mı" sorusu artık `messages.test.ts` içinde,
       iki dil için birden soruluyor. */
    for (const type of TYPES) {
      expect(APPOINTMENT_TYPE_PALETTE[type].accent).toMatch(/^bg-chart-[1-5]$/);
    }
  });

  it("beş kategori beş farklı renk kullanıyor", () => {
    /* İki kategori aynı rengi alsaydı takvimde ayırt edilemezlerdi. */
    const accents = TYPES.map((type) => APPOINTMENT_TYPE_PALETTE[type].accent);
    expect(new Set(accents).size).toBe(TYPES.length);
  });

  it("boş başlık yerine kategori adı geçiyor — VE TÜRKÇE KALIYOR", () => {
    /* Çıktı veritabanına yazılıyor (`appointments.title`, aktivite akışı,
       bildirim). Kaydedilmiş metin okuyanın diline göre değişemez; gerekçe
       `lib/appointments.ts` içindeki `STORED_TYPE_LABELS` başlığında. */
    expect(appointmentTitle("", "ev_gezme")).toBe("Ev gezme");
    expect(appointmentTitle("   ", "telefon_gorusmesi")).toBe(
      "Telefon görüşmesi",
    );
    expect(appointmentTitle("  Kadıköy turu  ", "ev_gezme")).toBe(
      "Kadıköy turu",
    );
  });
});

describe("durum geçişleri", () => {
  it("planlı randevu tamamlanabilir ya da iptal edilebilir", () => {
    expect(canTransition("planlandi", "tamamlandi").ok).toBe(true);
    expect(canTransition("planlandi", "iptal").ok).toBe(true);
  });

  it("terminal durum yok — her şey geri alınabilir", () => {
    /* Teklifin aksine (`lib/offers.ts`) randevunun arkasında satış satırı
       gibi bir zincir yok; yanlış işaretlenen bir randevu düzeltilebilmeli. */
    expect(canTransition("tamamlandi", "planlandi").ok).toBe(true);
    expect(canTransition("iptal", "planlandi").ok).toBe(true);
    for (const status of STATUSES) {
      expect(availableTransitions(status).length).toBeGreaterThan(0);
    }
  });

  /* Faz 22: red gerekçesi artık HAZIR CÜMLE DEĞİL, anahtar + durum değeri.
     Cümleyi action kuruyor (çeviriyle), bu yüzden test metne değil ANAHTARA
     ve taşınan parametreye bakıyor — dile bağımsız kalıyor. */
  it("tamamlanmış randevu doğrudan iptale gitmiyor", () => {
    const check = canTransition("tamamlandi", "iptal");
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.error).toBe("appointmentTransitionNotAllowed");
      expect(check.params).toEqual({ from: "tamamlandi", to: "iptal" });
    }
  });

  it("aynı duruma geçiş reddediliyor", () => {
    for (const status of STATUSES) {
      const check = canTransition(status, status);
      expect(check.ok).toBe(false);
      if (!check.ok) {
        expect(check.error).toBe("appointmentAlreadyInStatus");
        expect(check.params).toEqual({ status });
      }
    }
  });

  it("geçiş listesi kendini içermiyor", () => {
    for (const status of STATUSES) {
      expect(availableTransitions(status)).not.toContain(status);
    }
  });

  it("yalnızca planlı randevu sürüklenebiliyor", () => {
    expect(isReschedulable("planlandi")).toBe(true);
    expect(isReschedulable("tamamlandi")).toBe(false);
    expect(isReschedulable("iptal")).toBe(false);
  });
});

describe("çizelge eşlemesi", () => {
  it("her tür geçerli bir çizelge olayına düşüyor", () => {
    for (const type of TYPES) {
      const event = timelineEventFor(type);
      expect(CUSTOMER_EVENT_TYPES).toContain(event);
    }
  });

  it("ev gezme 'yerinde gezdi' olayına düşüyor", () => {
    expect(timelineEventFor("ev_gezme")).toBe("viewed");
    expect(timelineEventFor("telefon_gorusmesi")).toBe("called");
  });

  it("hiçbir randevu 'purchased' üretmiyor", () => {
    /* Satın alma çizelgeye teklif kabul edilince düşüyor; iki kaynak aynı
       olayı yazarsa çizelge aynı şeyi iki kez anlatır. */
    for (const type of TYPES) {
      expect(timelineEventFor(type)).not.toBe("purchased");
    }
  });

  it("açıklama ilanı varsa onu, yoksa konumu ekliyor", () => {
    expect(
      timelineDescription({
        title: "Kadıköy turu",
        type: "ev_gezme",
        listingTitle: "Deniz Manzaralı Daire",
        location: "Bağdat Cd.",
      }),
    ).toBe("Kadıköy turu · Deniz Manzaralı Daire");

    expect(
      timelineDescription({
        title: "",
        type: "ofis_gorusmesi",
        listingTitle: null,
        location: "Merkez ofis",
      }),
    ).toBe("Ofis görüşmesi · Merkez ofis");

    expect(
      timelineDescription({ title: "Ön görüşme", type: "diger" }),
    ).toBe("Ön görüşme");
  });
});
