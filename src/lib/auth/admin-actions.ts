"use server";

import { revalidatePath } from "next/cache";

import type { Agent, AgentRole } from "@/types/database";
import type { AgentAuditAction } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth/server";
import { isManagerRole } from "@/lib/agents";
import {
  fail,
  ok,
  raw,
  toMessage,
  type ActionErrorKey,
  type ActionResult,
} from "@/lib/actions/result";
import { removeStorageObjects } from "@/lib/storage/cleanup";
import { denyIfReadOnly } from "@/lib/actions/guard";

/**
 * ============================================================================
 * ⚠️  YÖNETİCİ İŞLEMLERİ — SERVİS ANAHTARI KULLANIR
 * ============================================================================
 * Projedeki diğer tüm server action'lar kullanıcının oturumuyla çalışır ve RLS
 * onları sınırlar. BURASI FARKLI: personel davet etmek Supabase Auth Admin
 * API'sini, o da servis anahtarını gerektiriyor — ve o anahtar her politikayı
 * atlar. Dosya bu yüzden ayrı ve adı açık.
 *
 * -----------------------------------------------------------------------------
 * KURAL: HER FONKSİYON `requireManager()` İLE BAŞLAR
 * -----------------------------------------------------------------------------
 * RLS burada bir güvenlik ağı DEĞİL — servis anahtarı onu zaten atlıyor. Yetki
 * kontrolü tek savunma hattı, bu yüzden atlanamaz ve ilk satırda olmalı.
 *
 * `requireManager()` rolü istemciden almaz; oturum çerezinden `getUser()` ile
 * doğrulanmış kullanıcıyı bulur, onun `agents` satırını RLS'e TABİ normal
 * istemciyle okur ve rolü oradan öğrenir. İstemcinin gönderdiği hiçbir değer
 * yetki kararına girmez.
 *
 * -----------------------------------------------------------------------------
 * DAVET AKIŞI NEDEN E-POSTA GÖNDERMİYOR
 * -----------------------------------------------------------------------------
 * `inviteUserByEmail()` var ama Supabase'in yerleşik SMTP'si saatte birkaç
 * e-postayla sınırlı ve kendi alan adınızdan gönderim için ayrı yapılandırma
 * istiyor. Yapılandırılmamış bir kurulumda davet SESSİZCE düşerdi — yönetici
 * "davet gönderildi" görür, personel hiçbir şey almaz.
 *
 * Bunun yerine geçici şifre üretilip yöneticiye BİR KEZ gösteriliyor; iletme
 * sorumluluğu açıkça onda. SMTP kurulduğunda `createUser` çağrısını
 * `inviteUserByEmail` ile değiştirmek tek satırlık bir iş.
 */

/* ==========================================================================
   Kapı
   ========================================================================== */

type Guard =
  | { ok: true; actor: Agent }
  | { ok: false; error: ActionErrorKey };

async function requireManager(): Promise<Guard> {
  const actor = await getCurrentAgent();

  if (!actor) {
    return {
      ok: false,
      error: "sessionNotLinked",
    };
  }
  /* Pasifleştirilmiş bir yönetici de yetkisiz: `getCurrentAgent` pasif kaydı
     döndürebiliyor (kullanıcı kendi satırını her zaman okur), o yüzden burada
     ayrıca bakılıyor. */
  if (!actor.is_active) {
    return { ok: false, error: "accountInactive" };
  }
  if (!isManagerRole(actor.role)) {
    return {
      ok: false,
      error: "managerRequired",
    };
  }

  return { ok: true, actor };
}

/* ==========================================================================
   Yardımcılar
   ========================================================================== */

/**
 * Geçici şifre.
 *
 * `crypto.getRandomValues` — `Math.random()` kriptografik değil ve bu değer bir
 * hesabın ilk anahtarı. Karakter kümesinden karıştırılabilir olanlar (0/O,
 * 1/l/I) çıkarıldı: şifre yazılı ya da sözlü olarak iletilecek.
 */
function generateTemporaryPassword(length = 16): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

/** "Ayşe Yılmaz" → "AY" */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

/**
 * Denetim kaydı — servis anahtarıyla yazılır.
 *
 * `agent_audit_log` tablosunda YAZMA POLİTİKASI YOK; giriş yapmış hiç kimse
 * (yönetici dahil) bu kayıtları elle üretemez ya da düzeltemez. Yalnızca bu
 * fonksiyon yazabilir.
 *
 * Hata yutuluyor: denetim kaydı yazılamadı diye asıl işlem geri alınmamalı.
 */
type AuditEntry = {
  agentId: string;
  actorAgentId: string;
  action: AgentAuditAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
};

async function writeAudit(entries: AuditEntry[]) {
  if (entries.length === 0) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("agent_audit_log").insert(
      entries.map((entry) => ({
        agent_id: entry.agentId,
        actor_agent_id: entry.actorAgentId,
        action: entry.action,
        field: entry.field ?? null,
        old_value: entry.oldValue ?? null,
        new_value: entry.newValue ?? null,
      })),
    );
    if (error) console.error(`[audit] yazılamadı: ${error.message}`);
  } catch (error) {
    console.error("[audit] yazılamadı:", error);
  }
}

function revalidateStaff(agentId?: string) {
  revalidatePath("/personeller");
  if (agentId) revalidatePath(`/personeller/${agentId}`);
  /* Danışman adı ilan ve müşteri detaylarındaki kartlarda da görünüyor. */
  revalidatePath("/ilanlar", "layout");
  revalidatePath("/musteriler", "layout");
}

/* ==========================================================================
   Davet
   ========================================================================== */

export type InviteResult = {
  agentId: string;
  email: string;
  /** Yöneticiye BİR KEZ gösterilir; hiçbir yere kaydedilmez. */
  temporaryPassword: string;
};

export async function inviteAgent(input: {
  email: string;
  fullName: string;
  title: string;
  role: AgentRole;
  commissionRate: number;
}): Promise<ActionResult<InviteResult>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const guard = await requireManager();
  if (!guard.ok) return fail(guard.error);

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("emailInvalid");
  }
  if (fullName.length < 3) {
    return fail("nameMin3");
  }
  if (input.commissionRate < 0 || input.commissionRate > 1) {
    return fail("commissionRateRange");
  }
  /* Yalnızca patron başka bir patron atayabilir: ofis müdürü kendisinden üst
     bir yetki üretememeli. */
  if (input.role === "patron" && guard.actor.role !== "patron") {
    return fail("patronRoleOnlyByPatron");
  }

  const admin = createAdminClient();

  /* Aynı e-postayla personel kaydı var mı — `agents.email` unique, ama önce
     bakmak kullanıcıya ham veritabanı hatası yerine anlaşılır bir mesaj
     veriyor. */
  const { data: existing } = await admin
    .from("agents")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return fail("agentEmailExists", { email });
  }

  const temporaryPassword = generateTemporaryPassword();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    /* Doğrulama e-postası beklenmesin — SMTP yapılandırılmamış olabilir ve o
       durumda hesap sonsuza kadar doğrulanmamış kalırdı. */
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !created.user) {
    if (authError?.message.includes("already been registered")) {
      return fail("authAccountExists", { email });
    }
    /* Auth sağlayıcısının kendi metni ÇEVRİLMİYOR — `raw` bunun bilinçli bir
       karar olduğunu söylüyor (gerekçe `lib/actions/result.ts`). */
    return authError ? fail(raw(authError.message)) : fail("authAccountFailed");
  }

  /* Personel kimliği: mevcut `agt-N` biçimi korunuyor. Dizi yok (0001'de
     yalnızca ilan ve müşteri için tanımlanmıştı), en büyük numaradan devam
     ediliyor. Eşzamanlı iki davet aynı numarayı üretebilir; `agents.id`
     birincil anahtar olduğu için ikincisi hata alır ve kullanıcı tekrar
     dener — nadir bir durum için dizi eklemeye değmedi. */
  const { data: rows } = await admin.from("agents").select("id");
  const nextNumber =
    Math.max(
      0,
      ...(rows ?? []).map((row) => Number(row.id.replace(/\D/g, "")) || 0),
    ) + 1;
  const agentId = `agt-${nextNumber}`;

  const { error: agentError } = await admin.from("agents").insert({
    id: agentId,
    full_name: fullName,
    initials: initialsOf(fullName),
    title: input.title.trim() || "Gayrimenkul Danışmanı",
    role: input.role,
    email,
    phone: "",
    user_id: created.user.id,
    commission_rate: input.commissionRate,
    is_active: true,
  });

  if (agentError) {
    /* Personel satırı yazılamadıysa auth kullanıcısı yetim kalır: giriş
       yapabilen ama hiçbir şey göremeyen bir hesap. Geri alıyoruz. */
    await admin.auth.admin.deleteUser(created.user.id);
    return fail(toMessage(agentError));
  }

  await writeAudit([
    {
      agentId,
      actorAgentId: guard.actor.id,
      action: "invited",
      field: "role",
      newValue: input.role,
    },
  ]);

  revalidateStaff(agentId);

  return ok({ agentId, email, temporaryPassword });
}

/* ==========================================================================
   Düzenleme
   ========================================================================== */

export async function updateAgent(
  agentId: string,
  input: {
    fullName: string;
    title: string;
    phone: string;
    role: AgentRole;
    commissionRate: number;
    avatarUrl: string;
  },
): Promise<ActionResult<{ id: string }>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const guard = await requireManager();
  if (!guard.ok) return fail(guard.error);

  if (input.commissionRate < 0 || input.commissionRate > 1) {
    return fail("commissionRateRange");
  }

  const admin = createAdminClient();

  const { data: current, error: readError } = await admin
    .from("agents")
    .select("id, full_name, title, phone, role, commission_rate, avatar_url")
    .eq("id", agentId)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!current) return fail("staffNotFound");

  /* İKİ YETKİ SINIRI:
     · Kimse kendi rolünü ya da primini değiştiremez — bir ofis müdürü kendini
       patron yapamasın, kimse kendi primini yükseltmesin.
     · Patron rolünü yalnızca patron verebilir/alabilir. */
  const isSelf = current.id === guard.actor.id;
  const roleChanged = current.role !== input.role;
  const commissionChanged = current.commission_rate !== input.commissionRate;

  if (isSelf && (roleChanged || commissionChanged)) {
    return fail(
      "cannotEditOwnRole",
    );
  }
  if (
    guard.actor.role !== "patron" &&
    (input.role === "patron" || current.role === "patron")
  ) {
    return fail("patronChangesOnlyByPatron");
  }

  const nextAvatar = input.avatarUrl === "" ? null : input.avatarUrl;

  const { error } = await admin
    .from("agents")
    .update({
      full_name: input.fullName.trim(),
      initials: initialsOf(input.fullName),
      title: input.title.trim(),
      phone: input.phone.trim(),
      role: input.role,
      commission_rate: input.commissionRate,
      avatar_url: nextAvatar,
    })
    .eq("id", agentId);

  if (error) return fail(toMessage(error));

  /* Değiştirilen portre Storage'da yetim kalmasın — Faz 7'deki cascade'in
     aynısı. */
  if (current.avatar_url && current.avatar_url !== nextAvatar) {
    await removeStorageObjects([current.avatar_url]);
  }

  /* Rol ve prim ayrı ayrı kaydediliyor: ikisi birlikte değiştiyse denetim
     kaydında iki satır olmalı, "profil güncellendi" gibi belirsiz tek bir
     satır değil. İkisi de değişmediyse geriye ad/unvan/telefon kalıyor. */
  const audits: AuditEntry[] = [];

  if (roleChanged) {
    audits.push({
      agentId,
      actorAgentId: guard.actor.id,
      action: "role_changed",
      field: "role",
      oldValue: current.role,
      newValue: input.role,
    });
  }
  if (commissionChanged) {
    audits.push({
      agentId,
      actorAgentId: guard.actor.id,
      action: "commission_changed",
      field: "commission_rate",
      oldValue: String(current.commission_rate),
      newValue: String(input.commissionRate),
    });
  }
  if (audits.length === 0) {
    audits.push({
      agentId,
      actorAgentId: guard.actor.id,
      action: "profile_updated",
    });
  }

  await writeAudit(audits);

  revalidateStaff(agentId);
  return ok({ id: agentId });
}

/* ==========================================================================
   Pasifleştirme
   ========================================================================== */

export async function setAgentActive(
  agentId: string,
  isActive: boolean,
): Promise<ActionResult<{ id: string }>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const guard = await requireManager();
  if (!guard.ok) return fail(guard.error);

  if (agentId === guard.actor.id) {
    return fail("cannotDeactivateSelf");
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("agents")
    .select("id, role, is_active")
    .eq("id", agentId)
    .maybeSingle();

  if (!target) return fail("staffNotFound");
  if (target.is_active === isActive) {
    return fail(isActive ? "staffAlreadyActive" : "staffAlreadyInactive");
  }
  if (target.role === "patron" && guard.actor.role !== "patron") {
    return fail("patronDeactivateOnlyByPatron");
  }

  /* SON PATRONU KİLİTLEME. Tüm patronlar pasifleştirilirse kimse kimseyi
     geri açamaz — sistem SQL Editor'süz kurtarılamaz hale gelir. */
  if (target.role === "patron" && !isActive) {
    const { count } = await admin
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("role", "patron")
      .eq("is_active", true);

    if ((count ?? 0) <= 1) {
      return fail(
        "lastPatron",
      );
    }
  }

  const { error } = await admin
    .from("agents")
    .update({ is_active: isActive })
    .eq("id", agentId);

  if (error) return fail(toMessage(error));

  await writeAudit([
    {
      agentId,
      actorAgentId: guard.actor.id,
      action: isActive ? "reactivated" : "deactivated",
      field: "is_active",
      oldValue: String(!isActive),
      newValue: String(isActive),
    },
  ]);

  revalidateStaff(agentId);
  return ok({ id: agentId });
}
