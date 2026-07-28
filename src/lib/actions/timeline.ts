"use server";

import { revalidatePath } from "next/cache";

import type { CustomerEventType } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";

/**
 * ============================================================================
 * GÖRÜŞME KAYDI
 * ============================================================================
 * Faz 7'ye kadar `customer_timeline_events` tablosuna yalnızca seed yazıyordu;
 * çizelge arayüzde salt okunurdu. Yani gerçek bir görüşme yapıldığında sisteme
 * işlenemiyordu — bir CRM için tuhaf bir boşluk.
 *
 * `occurred_at` GÖNDERİLMİYOR, veritabanı `now()` basıyor. Tabloda ayrıca
 * `created_at` var ve ikisi bilinçli olarak ayrı: "olayın gerçekleştiği an" ile
 * "satırın yazıldığı an" farklı şeyler. Geçmişe dönük kayıt (dün görüştüm ama
 * bugün giriyorum) bir tarih seçici ister; o gelene kadar ikisi eşit ve bu
 * dürüst — uydurulmuş bir tarih taşımaktansa yazıldığı anı taşısın.
 */

export async function createCustomerEvent(input: {
  customerId: string;
  type: CustomerEventType;
  note: string;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_timeline_events")
    .insert({
      customer_id: input.customerId,
      event_type: input.type,
      description: input.note,
    })
    .select("id")
    .single();

  if (error) return fail(toMessage(error));

  /* Müşteriyle en son ne zaman görüşüldüğü liste sayfasının varsayılan
     sıralaması ve "Görüşülmedi" rozeti bu alandan besleniyor; yeni bir olay
     eklendiğinde güncellenmezse çizelge ile kart birbirini yalanlar.

     `created` hariç: kayıt oluşturma olayı bir görüşme değil. */
  if (input.type !== "created") {
    await supabase
      .from("customers")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", input.customerId);
  }

  revalidatePath(`/musteriler/${input.customerId}`);
  revalidatePath("/musteriler");
  revalidatePath("/dashboard");

  return ok({ id: data.id });
}
