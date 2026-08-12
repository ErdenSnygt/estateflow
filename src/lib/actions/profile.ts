"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import {
  serializeNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";
import { removeUnusedObjects } from "@/lib/storage/cleanup";
import {
  fail,
  ok,
  raw,
  toMessage,
  type ActionErrorKey,
  type ActionResult,
} from "@/lib/actions/result";

/**
 * ============================================================================
 * KENDİ PROFİLİM
 * ============================================================================
 * `lib/auth/admin-actions.ts` ile KARIŞTIRILMAMALI. Orası servis anahtarıyla
 * çalışıyor ve BAŞKASININ kaydını değiştiriyor (rol, prim, pasifleştirme);
 * burası kullanıcının kendi oturumuyla çalışıyor ve yalnızca kendi satırına
 * dokunuyor.
 *
 * -----------------------------------------------------------------------------
 * HANGİ ALANLAR YAZILABİLİR
 * -----------------------------------------------------------------------------
 * Yalnızca kimlik ve iletişim: ad, unvan, telefon, fotoğraf, kapak, bildirim
 * tercihleri. `role`, `commission_rate`, `is_active`, `user_id` ve `email`
 * BURAYA GİRMİYOR ve bu bir tercih değil, güvenlik sınırı:
 *
 *   · rol / prim / aktiflik → yetki ve para; yalnızca yönetici, ayrı dosyada.
 *   · email → oturum kimliği. `agents.email` ile `auth.users.email` ayrı
 *     yaşıyor ve birini değiştirip diğerini bırakmak kullanıcının giriş
 *     yapamamasına yol açabilirdi. E-posta değişimi Supabase'in doğrulama
 *     akışını gerektiriyor; kapsam dışı ve README'de yazılı.
 *
 * -----------------------------------------------------------------------------
 * RLS BURADA TEK BAŞINA YETMİYOR
 * -----------------------------------------------------------------------------
 * `agents_self_update` politikası (`0010_settings.sql`) kullanıcının kendi
 * SATIRINI güncellemesine izin veriyor ama Postgres satır seviyesinde karar
 * verir — "şu kolonlar hariç" diyemez. Yani politika tek başına bir danışmanın
 * kendi rolünü `patron` yapmasını engellemiyor.
 *
 * Kolon koruması bu yüzden BURADA: aşağıdaki `update` çağrıları alan listesini
 * elle kuruyor, istemciden gelen gövde doğrudan geçirilmiyor. Projedeki tek
 * "uygulama katmanı da savunma hattı" noktası ve migration'da da işaretli.
 */

function revalidateProfile(agentId: string) {
  revalidatePath("/ayarlar");
  revalidatePath("/profil");
  revalidatePath(`/personeller/${agentId}`);
  revalidatePath("/personeller");
  /* Kullanıcı kartı ve navbar avatarı layout'ta. */
  revalidatePath("/", "layout");
}

type Guard = { ok: true; id: string } | { ok: false; error: ActionErrorKey };

async function requireSelf(): Promise<Guard> {
  const agent = await getCurrentAgent();
  if (!agent) return { ok: false, error: "agentNotFound" };
  if (!agent.is_active) return { ok: false, error: "accountInactive" };
  return { ok: true, id: agent.id };
}

/* ==========================================================================
   Kimlik ve iletişim
   ========================================================================== */

export type ProfileInput = {
  fullName: string;
  title: string;
  phone: string;
  avatarUrl: string;
  coverUrl: string;
};

export async function updateProfile(
  input: ProfileInput,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireSelf();
  if (!guard.ok) return fail(guard.error);

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return fail("profileNameMin2");
  }

  const supabase = await createClient();

  /* Eski görseller okunuyor: değiştirilen fotoğrafın dosyası bucket'ta
     kalmasın. Faz 7'deki silme cascade'inin aynısı. */
  const { data: current } = await supabase
    .from("agents")
    .select("avatar_url, cover_url")
    .eq("id", guard.id)
    .maybeSingle();

  /* Baş harfler addan TÜRETİLİYOR, formdan alınmıyor: iki alanın elle
     senkronize tutulması gereken bir kopya olması, er ya da geç "Ahmet Yılmaz
     / MK" gibi tutarsızlıklar üretir. */
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");

  const { error } = await supabase
    .from("agents")
    .update({
      full_name: fullName,
      initials: initials || fullName.slice(0, 2).toLocaleUpperCase("tr-TR"),
      title: input.title.trim(),
      phone: input.phone.trim(),
      avatar_url: input.avatarUrl.trim() || null,
      cover_url: input.coverUrl.trim() || null,
    })
    .eq("id", guard.id);

  if (error) return fail(toMessage(error));

  await removeUnusedObjects(
    [current?.avatar_url, current?.cover_url].filter(
      (url): url is string => Boolean(url),
    ),
    [input.avatarUrl, input.coverUrl].filter(Boolean),
  );

  revalidateProfile(guard.id);
  return ok({ id: guard.id });
}

/* ==========================================================================
   Bildirim tercihleri
   ========================================================================== */

export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireSelf();
  if (!guard.ok) return fail(guard.error);

  const supabase = await createClient();

  /* `serialize` bilinmeyen anahtarları düşürüyor: jsonb şemasız olduğu için
     istemciden gelen gövde doğrudan yazılsaydı kolona istenen her şey
     girebilirdi. */
  const { error } = await supabase
    .from("agents")
    .update({
      notification_preferences: serializeNotificationPreferences(preferences),
    })
    .eq("id", guard.id);

  if (error) return fail(toMessage(error));

  revalidateProfile(guard.id);
  return ok({ id: guard.id });
}

/* ==========================================================================
   Şifre değiştirme
   ========================================================================== */

/**
 * Şifre değiştirme — MEVCUT ŞİFRE DOĞRULAMALI.
 *
 * -----------------------------------------------------------------------------
 * NEDEN `updateUser` TEK BAŞINA YETMİYOR
 * -----------------------------------------------------------------------------
 * Supabase'in `auth.updateUser({ password })` çağrısı mevcut şifreyi SORMUYOR;
 * geçerli bir oturum yeterli. Yani açık bırakılmış bir bilgisayarda oturuma
 * erişen biri şifreyi değiştirip hesabı devralabilirdi.
 *
 * Bu yüzden önce `signInWithPassword` ile mevcut şifre doğrulanıyor. Çağrı
 * başarılıysa şifre doğru demektir; başarısızsa işlem hiç başlamıyor.
 *
 * `signInWithPassword` YENİ BİR OTURUM AÇIYOR ve bu kabul edilebilir: aynı
 * kullanıcı, aynı cihaz, aynı çerez — sonuç, oturumun tazelenmesi. Farklı bir
 * kullanıcının kimliğine geçiş mümkün değil çünkü e-posta oturumdan okunuyor,
 * istemciden değil.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult<{ ok: true }>> {
  const guard = await requireSelf();
  if (!guard.ok) return fail(guard.error);

  if (input.newPassword.length < 8) {
    return fail("passwordMin8");
  }
  if (input.newPassword === input.currentPassword) {
    return fail("passwordSameAsOld");
  }

  const supabase = await createClient();

  /* E-posta OTURUMDAN okunuyor, formdan değil: istemcinin gönderdiği bir
     e-posta ile başkasının şifresini deneme yolu açılmasın. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return fail("sessionUnreadable");
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });

  if (verifyError) {
    /* Ham mesaj "Invalid login credentials" — kullanıcıya burada ne anlama
       geldiğini söylüyoruz. */
    return fail("passwordWrong");
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (error) {
    /* Supabase'in kendi şifre politikası (uzunluk, sızmış şifre kontrolü)
       burada devreye girebiliyor; mesajı olduğu gibi geçiriyoruz —
       `raw` bunun bilinçli olduğunu söylüyor (bkz. `result.ts`). */
    return fail(raw(error.message));
  }

  return ok({ ok: true });
}
