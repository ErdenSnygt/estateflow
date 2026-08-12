import { describe, expect, it } from "vitest";

import type { AgentRole } from "@/types/database";
import {
  AGENT_ROLES,
  AGENT_ROLE_TONES,
  canAssignAgent,
  canViewStaff,
  isManagerRole,
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
  it("personel görüntüleme ve atama yöneticiye bağlıdır", () => {
    for (const role of ROLES) {
      expect(canViewStaff(role)).toBe(isManagerRole(role));
      expect(canAssignAgent(role)).toBe(isManagerRole(role));
    }
  });

  it("bağlanmamış kullanıcı hiçbirini yapamaz", () => {
    expect(canViewStaff(null)).toBe(false);
    expect(canAssignAgent(null)).toBe(false);
  });
});

describe("rol listesi", () => {
  /* Faz 25: `AGENT_ROLE_LABELS` kalktı, etiketler sözlüğe geçti
     (`agents.role.*`). Etiketlerin varlığını artık `messages.test.ts` iki
     dil için birden denetliyor; burada YAPI kaldı. */
  it("her rolün bir rozet tonu var", () => {
    for (const role of ROLES) {
      expect(AGENT_ROLE_TONES[role]).toBeTruthy();
    }
  });

  it("sıralı dizi bilinen üç rolü kapsıyor", () => {
    expect([...AGENT_ROLES].sort()).toEqual([...ROLES].sort());
  });
});
