"use server";

import { revalidatePath } from "next/cache";

import type { ListingInsert, ListingUpdate } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";
import { getCurrentAgent } from "@/lib/auth/server";
import { notify } from "@/lib/actions/notify";
import {
  removeStorageObjects,
  removeUnusedObjects,
} from "@/lib/storage/cleanup";

/**
 * ============================================================================
 * İLAN YAZMA İŞLEMLERİ
 * ============================================================================
 * Faz 5'e kadar form `console.info` ile sahte bir kayıt yapıyordu. Artık
 * gerçek: server action, kullanıcının oturumuna bağlı Supabase istemcisiyle
 * çalışır, dolayısıyla RLS politikaları burada da geçerlidir — giriş yapmamış
 * biri action'ı doğrudan çağırsa bile yazamaz.
 */

/**
 * Yayına alınan bir ilanın yayın tarihi olmalı. Bu kural formda değil burada
 * duruyor: hem oluşturma hem düzenleme aynı davranışı göstersin, ve istemci
 * tarafında değiştirilebilir bir alan olmasın.
 */
function withPublishedAt<T extends { status?: string }>(
  input: T,
  current: string | null,
): T & { published_at?: string | null } {
  if (input.status === undefined) return input;
  if (input.status === "taslak") return { ...input, published_at: null };
  return { ...input, published_at: current ?? new Date().toISOString() };
}

/** Liste, dashboard ve detay sayfaları aynı veriyi gösteriyor. */
function revalidateListings(id?: string) {
  revalidatePath("/ilanlar");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/ilanlar/${id}`);
}

export async function createListing(
  input: ListingInsert,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  /* `id` gönderilmiyor: kod üretimi veritabanındaki dizide (`iln-` + nextval)
     duruyor, böylece iki eşzamanlı kayıt aynı numarayı alamaz. */
  const { data, error } = await supabase
    .from("listings")
    .insert(withPublishedAt(input, null))
    .select("id")
    .single();

  if (error) return fail(toMessage(error));

  /* İlanın atandığı danışmanın gelen kutusuna. Kendi ilanını ekleyen danışman
     bildirim almıyor (`notify()` aktörle hedef aynıysa atlıyor); bildirim
     ancak bir yönetici başkasının portföyüne ilan girdiğinde düşüyor. */
  const actor = await getCurrentAgent();
  await notify(supabase, {
    agentId: input.agent_id,
    actorAgentId: actor?.id,
    type: "listing_created",
    title: "Portföyünüze yeni ilan eklendi",
    description: input.title,
    entityType: "listing",
    entityId: data.id as string,
  });

  revalidateListings(data.id);
  return ok({ id: data.id as string });
}

export async function updateListing(
  id: string,
  input: ListingUpdate,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  /* `images` de okunuyor: güncelleme sonrası artık kullanılmayan dosyaları
     Storage'dan silmek için önceki listeye ihtiyaç var. */
  const { data: current, error: readError } = await supabase
    .from("listings")
    .select("published_at, images")
    .eq("id", id)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!current) return fail("İlan bulunamadı; başka biri silmiş olabilir.");

  const { error } = await supabase
    .from("listings")
    .update(withPublishedAt(input, current.published_at))
    .eq("id", id);

  if (error) return fail(toMessage(error));

  /* CASCADE'İN SON HALKASI — 1/3: formdan çıkarılan fotoğraflar.
     Yalnızca `images` gönderildiyse çalışır; kısmi güncellemeler (ör. yalnızca
     durum değişikliği) galeriye dokunmadığı için atlanmalı. */
  if (input.images) {
    await removeUnusedObjects(current.images, input.images);
  }

  revalidateListings(id);
  return ok({ id });
}

export async function deleteListing(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  /* Görseller satır silinmeden ÖNCE okunmalı — sonrasında adreslerine
     ulaşmanın yolu kalmaz. */
  const { data: current } = await supabase
    .from("listings")
    .select("images")
    .eq("id", id)
    .maybeSingle();

  /* İlgi kayıtları ve aktivite satırları şemada `on delete cascade`;
     kapanan satışlarda ilan referansı null'a düşer, ciro geçmişi silinmez. */
  const { error } = await supabase.from("listings").delete().eq("id", id);

  if (error) return fail(toMessage(error));

  /* CASCADE'İN SON HALKASI — 2/3: Storage yabancı anahtar cascade'ine dahil
     değil, dosyalar burada temizlenmezse bucket'ta yetim kalır. */
  if (current?.images) await removeStorageObjects(current.images);

  revalidateListings(id);
  revalidatePath("/musteriler");
  return ok(undefined);
}
