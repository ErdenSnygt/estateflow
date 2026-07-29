"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";

/**
 * ============================================================================
 * BİLDİRİM OKUMA İŞLEMLERİ
 * ============================================================================
 * Bildirim YAZMA burada değil, `lib/actions/notify.ts` içinde — o bir server
 * action değil, başka action'ların çağırdığı bir yardımcı. Ayrım bilinçli:
 * "bana bildirim yaz" dışa açık bir uç olsaydı istemci istediği kişiye
 * istediği bildirimi gönderebilirdi.
 *
 * Buradaki üç action ise kullanıcının KENDİ gelen kutusuna dokunuyor ve RLS
 * de öyle diyor: `notifications_update` politikası yalnızca `agent_id = ben`
 * satırlarına izin veriyor — bir yönetici bile başkasının bildirimini okundu
 * yapamıyor (okuyabiliyor ama yönetemiyor).
 */

function revalidateNotifications() {
  revalidatePath("/bildirimler");
  /* Zil rozeti her sayfada; layout'u besleyen sorgu tazelensin. */
  revalidatePath("/", "layout");
}

/** Kullanıcının kendi kimliği — action'ların hepsi bununla sınırlanıyor. */
async function requireAgentId(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const agent = await getCurrentAgent();
  if (!agent) return { ok: false, error: "Personel kaydınız bulunamadı." };
  if (!agent.is_active) return { ok: false, error: "Hesabınız pasif durumda." };
  return { ok: true, id: agent.id };
}

export async function markNotificationRead(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAgentId();
  if (!guard.ok) return fail(guard.error);

  const supabase = await createClient();

  /* `agent_id` koşulu RLS'te zaten var; burada da yazılı olması sorguyu
     indeksli ve niyeti okunur kılıyor. `read_at is null` ise gereksiz
     yazmayı önlüyor — zaten okunmuş satırın damgası değişmesin. */
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agent_id", guard.id)
    .is("read_at", null);

  if (error) return fail(toMessage(error));

  revalidateNotifications();
  return ok({ id });
}

/** Okundu işaretini geri alır — yanlışlıkla tıklanan bildirim için. */
export async function markNotificationUnread(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAgentId();
  if (!guard.ok) return fail(guard.error);

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: null })
    .eq("id", id)
    .eq("agent_id", guard.id);

  if (error) return fail(toMessage(error));

  revalidateNotifications();
  return ok({ id });
}

export async function markAllNotificationsRead(): Promise<
  ActionResult<{ count: number }>
> {
  const guard = await requireAgentId();
  if (!guard.ok) return fail(guard.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("agent_id", guard.id)
    .is("read_at", null)
    .select("id");

  if (error) return fail(toMessage(error));

  revalidateNotifications();
  return ok({ count: data?.length ?? 0 });
}

/**
 * Tek bildirimi siler.
 *
 * Gelen kutusu birikiyor ve okunmuş bir bildirimin sonsuza kadar durmasının
 * bir değeri yok. Toplu temizlik (`okunmuşları sil`) bilinçli olarak YOK:
 * yanlış tıklamada geri alınamaz bir kayıp olurdu ve tek tek silmek zaten
 * mümkün.
 */
export async function deleteNotification(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAgentId();
  if (!guard.ok) return fail(guard.error);

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("agent_id", guard.id);

  if (error) return fail(toMessage(error));

  revalidateNotifications();
  return ok({ id });
}
