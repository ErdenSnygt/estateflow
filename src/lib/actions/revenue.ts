"use server";

import { revalidatePath } from "next/cache";

import type { CommissionStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import { isManagerRole } from "@/lib/agents";
import { canTransitionCommission } from "@/lib/revenue";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";

/**
 * ============================================================================
 * KOMİSYON TAHSİLAT DURUMU
 * ============================================================================
 * -----------------------------------------------------------------------------
 * NEDEN ROL KONTROLÜ UYGULAMADA
 * -----------------------------------------------------------------------------
 * `sales_scoped` politikası (0005) bir danışmanın KENDİ satış satırını
 * güncellemesine izin veriyor — yani RLS tek başına, danışmanın kendi
 * komisyonunu "tahsil edildi" işaretlemesini engellemiyor.
 *
 * Postgres satır seviyesinde karar verir; "bu kolona yalnızca yönetici
 * dokunabilir" diyemez. Kısıt bu yüzden burada, action'ın ilk satırında.
 * Aynı durumun bir örneği daha `lib/actions/profile.ts` içinde (kendi
 * rolünü değiştirememe) ve orada da gerekçesi yazılı.
 *
 * Tahsilat bir MUHASEBE OLAYI: parayı kimin aldığını danışmanın kendisi
 * beyan edemez.
 */

export async function updateCommissionStatus(
  saleId: string,
  next: CommissionStatus,
): Promise<ActionResult<{ id: string }>> {
  const agent = await getCurrentAgent();

  if (!agent) return fail("Personel kaydınız bulunamadı.");
  if (!agent.is_active) return fail("Hesabınız pasif durumda.");
  if (!isManagerRole(agent.role)) {
    return fail(
      "Tahsilat durumunu yalnızca patron veya ofis müdürü değiştirebilir.",
    );
  }

  const supabase = await createClient();

  const { data: sale, error: readError } = await supabase
    .from("sales")
    .select("id, commission_status")
    .eq("id", saleId)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!sale) return fail("Satış kaydı bulunamadı.");

  /* Geçiş kuralı saf bir fonksiyonda ve arayüz de aynı kaynağa bakıyor —
     düğmeler ile sunucu aynı şeyi söylesin (`lib/offers.ts` ile aynı desen). */
  const check = canTransitionCommission(sale.commission_status, next);
  if (!check.ok) return fail(check.reason);

  /* Koşula mevcut durum ekli: aynı kayıt iki sekmede birden işaretlenirse
     ikincisi hiçbir satır güncelleyemez ve kullanıcı bunu görür. */
  const { data: updated, error } = await supabase
    .from("sales")
    .update({ commission_status: next })
    .eq("id", saleId)
    .eq("commission_status", sale.commission_status)
    .select("id");

  if (error) return fail(toMessage(error));
  if (!updated || updated.length === 0) {
    return fail("Kaydın durumu bu sırada değişmiş; sayfayı yenileyin.");
  }

  revalidatePath("/gelirler");
  revalidatePath("/raporlar");
  revalidatePath("/dashboard");
  return ok({ id: saleId });
}
