"use server";

import { revalidatePath } from "next/cache";

import type { CustomerInsert, CustomerUpdate } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";
import { removeStorageObjects } from "@/lib/storage/cleanup";
import { getCurrentAgent } from "@/lib/auth/server";
import { notify } from "@/lib/actions/notify";
import { denyIfReadOnly } from "@/lib/actions/guard";

/**
 * ============================================================================
 * MÜŞTERİ YAZMA İŞLEMLERİ
 * ============================================================================
 * `actions/listings.ts` ile birebir aynı desen — sonuç nesnesi, `revalidatePath`
 * ile önbellek tazeleme, hata kodundan Türkçe mesaj. Şablonun ikinci modülde
 * da tuttuğu yer burası.
 */

function revalidateCustomers(id?: string) {
  revalidatePath("/musteriler");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/musteriler/${id}`);
}

export async function createCustomer(
  input: CustomerInsert,
): Promise<ActionResult<{ id: string }>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert(input)
    .select("id")
    .single();

  if (error) return fail(toMessage(error));

  /* Yeni müşteri kaydı akışta görünsün — dashboard'daki "Son Aktiviteler"
     listesi gerçek bir tabloyu okuyor, kayıt buraya yazılmazsa görünmez. */
  await supabase.from("activity_log").insert({
    event_type: "customer_added",
    description: input.full_name,
    amount: null,
    actor_agent_id: input.assigned_agent_id,
    related_listing_id: null,
    related_customer_id: data.id,
  });

  /* KİŞİSEL BİLDİRİM — yukarıdaki `activity_log` satırıyla karıştırılmamalı.
     O ofisin ortak akışına düşüyor ve herkes aynı listeyi görüyor; bu ise
     müşterinin atandığı danışmanın gelen kutusuna.

     Danışman müşteriyi kendisi eklediyse bildirim YAZILMIYOR: `notify()`
     `actorAgentId` eşleşmesinde atlıyor. Bildirim ancak bir yönetici başka
     birinin üzerine müşteri açtığında anlamlı — o kişinin haberi olmalı. */
  const actor = await getCurrentAgent();
  await notify(supabase, {
    agentId: input.assigned_agent_id,
    actorAgentId: actor?.id,
    type: "customer_added",
    title: "Size yeni bir müşteri atandı",
    description: input.full_name,
    entityType: "customer",
    entityId: data.id,
  });

  revalidateCustomers(data.id);
  return ok({ id: data.id as string });
}

export async function updateCustomer(
  id: string,
  input: CustomerUpdate,
): Promise<ActionResult<{ id: string }>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const supabase = await createClient();

  /* Eski portre adresi güncelleme öncesi okunur; değiştiyse dosya yetim
     kalacak demektir.

     FAZ 19'DAN SONRA BU DAL YALNIZCA TEMİZLİK: müşteri fotoğrafı kaldırıldı ve
     `toCustomerInput` artık her zaman `null` yazıyor. Yani buradaki silme,
     özellik kaldırılmadan önce yüklenmiş bir dosya varsa onu bucket'tan
     düşürüyor. Kaldırmak, o dosyaları kalıcı olarak yetim bırakırdı. */
  const { data: current } = await supabase
    .from("customers")
    .select("avatar_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("customers").update(input).eq("id", id);

  if (error) return fail(toMessage(error));

  /* CASCADE'İN SON HALKASI — 3/3: değiştirilen ya da kaldırılan portre.
     `input.avatar_url === undefined` ise alan güncellemeye hiç girmemiş
     demektir, dosyaya dokunulmaz. */
  if (
    input.avatar_url !== undefined &&
    current?.avatar_url &&
    current.avatar_url !== input.avatar_url
  ) {
    await removeStorageObjects([current.avatar_url]);
  }

  revalidateCustomers(id);
  return ok({ id });
}
