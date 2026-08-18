import { describe, expect, it } from "vitest";

import type { AgentRole } from "@/types/database";
import {
  AGENT_ROLES,
  AGENT_ROLE_TONES,
  ALL_AGENT_ROLES,
  canAssignAgent,
  canViewAll,
  canViewStaff,
  isManagerRole,
  isReadOnlyRole,
} from "@/lib/agents";

/**
 * Yetki yüklemleri.
 *
 * Bunlar veriyi KORUMUYOR — asıl kapı RLS politikaları. Ama arayüzün neyi
 * göstereceğine karar veriyorlar ve yanlış giderlerse kullanıcı ya
 * yapamayacağı düğmeler görür ya da hakkı olan ekranlara giremez. Ayrıca
 * `is_manager()` SQL fonksiyonuyla AYNI kümeyi tanımlamak zorundalar; ikisi
 * ayrışırsa arayüz ile veritabanı farklı şeyler söyler.
 */

const ROLES: AgentRole[] = ["patron", "ofis_muduru", "danisman"];
const ALL: AgentRole[] = [...ROLES, "demo"];

describe("isManagerRole", () => {
  it("patron ve ofis müdürü yöneticidir", () => {
    expect(isManagerRole("patron")).toBe(true);
    expect(isManagerRole("ofis_muduru")).toBe(true);
  });

  it("danışman yönetici değildir", () => {
    expect(isManagerRole("danisman")).toBe(false);
  });

  it("rolü olmayan kullanıcı yönetici değildir", () => {
    /* Personel kaydına bağlanmamış kullanıcı: `getCurrentAgent()` null döner
       ve çağıranlar `currentAgent?.role` geçiyor. En dar varsayım doğru
       olandır — belirsizlik yetki vermez. */
    expect(isManagerRole(null)).toBe(false);
    expect(isManagerRole(undefined)).toBe(false);
  });

  it("beklenmeyen bir değer yetki vermez", () => {
    expect(isManagerRole("admin" as AgentRole)).toBe(false);
    expect(isManagerRole("" as AgentRole)).toBe(false);
  });
});

describe("türetilmiş yetkiler", () => {
  it("personel görüntüleme geniş görüşe, atama yöneticiliğe bağlıdır", () => {
    for (const role of ALL) {
      expect(canViewStaff(role)).toBe(canViewAll(role));
      expect(canAssignAgent(role)).toBe(isManagerRole(role));
    }
  });

  it("bağlanmamış kullanıcı hiçbirini yapamaz", () => {
    expect(canViewStaff(null)).toBe(false);
    expect(canAssignAgent(null)).toBe(false);
  });
});

/**
 * ============================================================================
 * DEMO ROLÜ — İKİ SORUNUN AYRILDIĞI YER (Faz 28)
 * ============================================================================
 * Bu bloktaki tek önemli iddia şu: `demo` GENİŞ GÖRÜR AMA YÖNETİCİ DEĞİLDİR.
 * İkisi tek bir yüklemle karıştırılırsa salt okunur hesap yazma yetkisi
 * kazanır — `isManagerRole` yalnızca ekran açmıyor, `canAssignAgent` ve üç
 * server action da ona bakıyor.
 */
describe("demo rolü", () => {
  it("yönetici DEĞİLDİR", () => {
    expect(isManagerRole("demo")).toBe(false);
  });

  it("geniş görüşe sahiptir — patron ve ofis müdürüyle aynı kümede", () => {
    expect(canViewAll("demo")).toBe(true);
    expect(canViewAll("patron")).toBe(true);
    expect(canViewAll("ofis_muduru")).toBe(true);
  });

  it("danışman geniş görüşe sahip değildir", () => {
    /* Demo eklenirken danışmanın kapsamı KAZAYLA genişlemesin. */
    expect(canViewAll("danisman")).toBe(false);
  });

  it("salt okunur olan yalnızca demodur", () => {
    expect(isReadOnlyRole("demo")).toBe(true);
    for (const role of ROLES) {
      expect(isReadOnlyRole(role), role).toBe(false);
    }
    expect(isReadOnlyRole(null)).toBe(false);
  });

  it("atama yapamaz", () => {
    expect(canAssignAgent("demo")).toBe(false);
  });
});

describe("rol listesi", () => {
  /* Faz 25: `AGENT_ROLE_LABELS` kalktı, etiketler sözlüğe geçti
     (`agents.role.*`). Etiketlerin varlığını artık `messages.test.ts` iki
     dil için birden denetliyor; burada YAPI kaldı. */
  it("her rolün bir rozet tonu var", () => {
    for (const role of ALL) {
      expect(AGENT_ROLE_TONES[role], role).toBeTruthy();
    }
  });

  it("seçilebilir roller üç tane — demo formda YOK", () => {
    /* Demo elle kurulan tek bir hesap; bir yöneticinin gerçek bir danışmanı
       yanlışlıkla salt okunur yapmasının önü kapalı. */
    expect([...AGENT_ROLES].sort()).toEqual([...ROLES].sort());
    expect(AGENT_ROLES).not.toContain("demo");
  });

  it("etiketi olması gereken liste demoyu da kapsıyor", () => {
    expect([...ALL_AGENT_ROLES].sort()).toEqual([...ALL].sort());
  });
});
