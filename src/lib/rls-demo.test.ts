import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ============================================================================
 * DEMO ROLÜ — RLS DEĞİŞMEZLERİ
 * ============================================================================
 * Bu dosya bir VERİTABANI TESTİ DEĞİL. Canlı bir Postgres'e bağlanmıyor; SQL
 * migration'larını okuyup politikaların NİHAİ metnini hesaplıyor ve üzerinde
 * yapısal iddialar sınıyor.
 *
 * NEDEN BÖYLE: projenin test kurulumu bilerek dar (`vitest.config.ts`
 * başlığı) — veritabanı gerektiren hiçbir şey burada çalışmıyor. Ama demo
 * rolünün güvenliği tam olarak politika METNİNE bağlı ve o metin bir dosyada
 * duruyor. Statik denetim burada gerçek bir şey koruyor: bir sonraki
 * migration `agents_self_update`i eski hâline döndürürse ya da yeni bir tabloya
 * `is_demo()` ile yazma izni verirse, bu testler düşer.
 *
 * NEYİ KANITLAMAZ: politikaların canlı veritabanına gerçekten uygulandığını.
 * Onun doğrulaması `0013_demo_role.sql` sonundaki `pg_policies` sorguları ve
 * iki `curl` denemesi — migration çalıştırıldıktan sonra elle.
 *
 * -----------------------------------------------------------------------------
 * DEMO NEYİ SAĞLAYABİLİR, NEYİ SAĞLAYAMAZ
 * -----------------------------------------------------------------------------
 * Politika koşullarını değerlendirirken kullanılan olgular:
 *
 *   is_manager()          → false  (demo yönetici değil)
 *   is_demo()             → true
 *   current_agent_id()    → 'agt-demo'  (null DEĞİL — kayıt var ve aktif)
 *   auth.uid()            → demo kullanıcısının uuid'si
 *
 * Üçüncüsü önemli: "bir personel kaydına bağlı mısın" diye soran bir politika
 * demoyu GEÇİRİR. `notifications_write` tam olarak bu yüzden açıktı.
 */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

type Policy = {
  name: string;
  schema: string;
  table: string;
  /** ALL | SELECT | INSERT | UPDATE | DELETE */
  command: string;
  /** `using` + `with check` gövdesi, boşlukları sadeleştirilmiş. */
  body: string;
  file: string;
};

/**
 * Bütün migration'ları SIRAYLA okuyup her politikanın son hâlini bulur.
 *
 * Aynı adlı politika sonraki bir dosyada yeniden kurulursa öncekini eziyor —
 * `drop policy if exists` + `create policy` deseni tam olarak bunu yapıyor.
 * Nihai durumu görmek için sıralı okuma şart: 0013'ün değiştirdiği iki
 * politika 0010 ve 0012'de tanımlıydı.
 */
function finalPolicies(): Policy[] {
  const byName = new Map<string, Policy>();

  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const raw = readFileSync(join(MIGRATIONS, file), "utf8");
    /* Yorum satırları atılıyor: gerekçe metinlerinde `is_demo()` geçiyor ve
       onları politika gövdesi sanmak testi yalancı yapardı. */
    const sql = raw
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    const pattern =
      /create policy (\w+)\s+on\s+([\w.]+)\s+for\s+(\w+)([^;]*);/g;

    for (const match of sql.matchAll(pattern)) {
      const [, name, qualified, command, rest] = match;
      const [schema, table] = qualified.includes(".")
        ? qualified.split(".")
        : ["public", qualified];

      byName.set(name, {
        name,
        schema,
        table,
        command: command.toUpperCase(),
        body: rest.replace(/\s+/g, " ").trim(),
        file,
      });
    }
  }

  return [...byName.values()];
}

const policies = finalPolicies();

/** Politika demoya İZİN mi veriyor (koşulda `is_demo()` olumlu geçiyor mu)? */
function grantsDemo(policy: Policy): boolean {
  return (
    policy.body.includes("is_demo()") && !policy.body.includes("not (select public.is_demo())")
  );
}

/** Politika demoyu AÇIKÇA dışarıda mı bırakıyor? */
function blocksDemo(policy: Policy): boolean {
  return policy.body.includes("not (select public.is_demo())");
}

const WRITE_COMMANDS = ["ALL", "INSERT", "UPDATE", "DELETE"];

describe("migration ayrıştırma", () => {
  it("politikalar okunabildi ve 0013 sonuncu dosya", () => {
    /* Ayrıştırıcı sessizce boş dönerse aşağıdaki bütün testler anlamsız
       biçimde 'geçer'. Önce ayrıştırmanın kendisi sınanıyor. */
    expect(policies.length).toBeGreaterThan(25);
    expect(policies.some((p) => p.file === "0013_demo_role.sql")).toBe(true);
  });
});

describe("demoya verilen izinler", () => {
  it("SADECE okuma — hiçbir yazma politikası demoya izin vermiyor", () => {
    const granting = policies.filter(grantsDemo);

    expect(granting.length).toBeGreaterThan(0);
    for (const policy of granting) {
      expect(policy.command, `${policy.table}.${policy.name}`).toBe("SELECT");
    }
  });

  it("izin veren politikaların hepsi 0013'ten geliyor", () => {
    /* Demo kavramı tek bir dosyada toplu dursun; başka bir migration'ın
       sessizce `is_demo()` kullanması gözden kaçmasın. */
    for (const policy of policies.filter(grantsDemo)) {
      expect(policy.file, policy.name).toBe("0013_demo_role.sql");
    }
  });
});

describe("A) demo kendi rolünü yükseltemez", () => {
  const selfUpdate = policies.find((p) => p.name === "agents_self_update");

  it("`agents_self_update` politikası duruyor", () => {
    expect(selfUpdate).toBeDefined();
    expect(selfUpdate?.command).toBe("UPDATE");
  });

  it("demo bu politikadan çıkarıldı", () => {
    /* Asıl iddia: `PATCH /agents?id=eq.agt-demo {"role":"patron"}` isteği
       artık hiçbir politikayı sağlamıyor. */
    expect(blocksDemo(selfUpdate!)).toBe(true);
  });

  it("`using` VE `with check` taraflarının İKİSİNDE de kapalı", () => {
    /* Yalnızca `with check` kapatılsaydı satır güncellenemezdi ama hata
       mesajı farklı yerden gelirdi; yalnızca `using` kapatılsaydı okuma
       tarafı kapanır, yazma tarafı bazı ifadelerde açık kalabilirdi. */
    const occurrences =
      selfUpdate!.body.split("not (select public.is_demo())").length - 1;
    expect(occurrences).toBe(2);
  });

  it("demonun `agents` tablosuna BAŞKA bir yazma yolu yok", () => {
    const writable = policies.filter(
      (p) =>
        p.table === "agents" &&
        WRITE_COMMANDS.includes(p.command) &&
        !blocksDemo(p),
    );

    /* Geriye yalnızca `agents_write` kalmalı ve o `is_manager()` istiyor —
       demo yönetici değil. */
    for (const policy of writable) {
      expect(policy.body, policy.name).toContain("is_manager()");
      expect(policy.body, policy.name).not.toContain("current_agent_id() is not null");
    }
  });
});

describe("B) demo bildirim yazamaz", () => {
  const write = policies.find((p) => p.name === "notifications_write");

  it("`notifications_write` politikası duruyor ve INSERT", () => {
    expect(write).toBeDefined();
    expect(write?.command).toBe("INSERT");
  });

  it("demo bu politikadan çıkarıldı", () => {
    expect(blocksDemo(write!)).toBe(true);
  });

  it("demonun `notifications` tablosuna başka bir yazma yolu yok", () => {
    const writable = policies.filter(
      (p) =>
        p.table === "notifications" &&
        WRITE_COMMANDS.includes(p.command) &&
        !blocksDemo(p),
    );

    /* `notifications_update` ve `notifications_delete` kalıyor; ikisi de
       `agent_id = current_agent_id()` istiyor ve `agt-demo`ya ait tek bir
       satır yok (seed demoya bildirim üretmiyor). */
    for (const policy of writable) {
      expect(policy.body, policy.name).toContain("agent_id");
      expect(policy.body, policy.name).toContain("current_agent_id()");
    }
  });
});

describe("mevcut rollerin davranışı değişmedi", () => {
  /**
   * Düzeltme deseni: politika metni birebir korunuyor, sonuna tek bir
   * `and not (select public.is_demo())` ekleniyor.
   *
   * `is_demo()` patron / ofis_muduru / danisman için `false` döndüğü için
   * `not false` = true; yani koşulun geri kalanı onlar için tek başına
   * belirleyici kalıyor. Aşağıdaki testler özgün yüklemin HÂLÂ ORADA
   * olduğunu sınıyor — ekleme yapılırken kazara bir şey silinmediğini.
   */
  it("`agents_self_update` özgün yüklemini koruyor", () => {
    const policy = policies.find((p) => p.name === "agents_self_update")!;
    expect(policy.body).toContain("user_id = (select auth.uid())");
  });

  it("`notifications_write` özgün yüklemini koruyor", () => {
    const policy = policies.find((p) => p.name === "notifications_write")!;
    expect(policy.body).toContain(
      "(select public.current_agent_id()) is not null",
    );
  });

  it("depolama yükleme politikaları özgün yüklemlerini koruyor", () => {
    const storage = policies.find((p) => p.name === "emlak_storage_insert")!;
    const documents = policies.find((p) => p.name === "emlak_documents_insert")!;

    expect(storage.body).toContain("bucket_id in ('listings', 'avatars')");
    expect(storage.body).toContain("public.current_agent_id() is not null");
    expect(documents.body).toContain("bucket_id = 'documents'");
    expect(documents.body).toContain("public.current_agent_id() is not null");
  });

  it("demoyu kapatan politika sayısı tam olarak dört", () => {
    /* Dördü de bilinçli ve sayılı: iki depolama yükleme (Faz 28),
       `agents_self_update` ve `notifications_write` (doğrulama turu).
       Beşincisi çıkarsa ya yeni bir açık kapatılmıştır ya da bir politika
       yanlışlıkla daraltılmıştır — ikisi de bakılmayı hak ediyor. */
    const blocked = policies.filter(blocksDemo).map((p) => p.name).sort();

    expect(blocked).toEqual([
      "agents_self_update",
      "emlak_documents_insert",
      "emlak_storage_insert",
      "notifications_write",
    ]);
  });
});

describe("bütün yazma politikaları demoya kapalı", () => {
  /**
   * Yukarıdaki testler iki bilinen açığı sınıyor; bu test AÇIK ARIYOR.
   *
   * Kural: demo bir yazma politikasını ancak koşul `is_manager()` ya da bir
   * sahiplik karşılaştırması (`… = current_agent_id()`, `owns_*`, `owner =
   * auth.uid()`) soruyorsa geçemez. "Bağlı mısın" tipi kapsamsız bir koşul
   * (`current_agent_id() is not null`) demoyu geçirir — `notifications_write`
   * tam olarak böyleydi.
   */
  const SCOPED = [
    "is_manager()",
    "owns_customer(",
    "owns_listing(",
    "= (select public.current_agent_id())",
    "= public.current_agent_id()",
    "owner = auth.uid()",
  ];

  it("kapsamsız 'bağlı mısın' koşulu taşıyan açık yazma politikası yok", () => {
    /* 0012'de düşürülen tablolar hariç — politikaları dosyada duruyor ama
       tablo artık yok. */
    const DROPPED = ["conversations", "messages"];

    const suspicious = policies.filter((policy) => {
      if (!WRITE_COMMANDS.includes(policy.command)) return false;
      if (blocksDemo(policy)) return false;
      if (DROPPED.includes(policy.table)) return false;
      return !SCOPED.some((marker) => policy.body.includes(marker));
    });

    expect(
      suspicious.map((p) => `${p.table}.${p.name} (${p.file})`),
      "kapsamsız yazma politikası bulundu",
    ).toEqual([]);
  });
});
