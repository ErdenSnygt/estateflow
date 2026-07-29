"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import { isManagerRole } from "@/lib/agents";
import { removeUnusedObjects } from "@/lib/storage/cleanup";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";

/**
 * ============================================================================
 * ŞİRKET AYARLARI
 * ============================================================================
 * Tek satırlık `company_settings` tablosu (`id = 'default'`); "hangi satır"
 * sorusu CHECK kısıtıyla kapatıldı — gerekçe `0010_settings.sql`.
 *
 * YETKİ İKİ KATMANDA: RLS `company_settings_write` politikasıyla yazmayı
 * yöneticiye kapatıyor, buradaki kontrol arayüzün de aynı şeyi söylemesi için.
 * Servis anahtarı KULLANILMIYOR — bu action kullanıcının kendi oturumuyla
 * çalışıyor, yani RLS gerçek bir güvenlik ağı (`admin-actions.ts`teki durumun
 * aksine).
 */

export type CompanyInput = {
  name: string;
  logoUrl: string;
  address: string;
  taxOffice: string;
  taxNumber: string;
  phone: string;
  email: string;
};

export async function updateCompanySettings(
  input: CompanyInput,
): Promise<ActionResult<{ ok: true }>> {
  const agent = await getCurrentAgent();

  if (!agent) return fail("Personel kaydınız bulunamadı.");
  if (!agent.is_active) return fail("Hesabınız pasif durumda.");
  if (!isManagerRole(agent.role)) {
    return fail("Şirket bilgilerini yalnızca yöneticiler düzenleyebilir.");
  }

  const name = input.name.trim();
  if (!name) return fail("Şirket adı boş olamaz.");

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("company_settings")
    .select("logo_url")
    .eq("id", "default")
    .maybeSingle();

  const logoUrl = input.logoUrl.trim();

  const { error } = await supabase
    .from("company_settings")
    .update({
      name,
      logo_url: logoUrl || null,
      address: input.address.trim(),
      tax_office: input.taxOffice.trim(),
      tax_number: input.taxNumber.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
    })
    .eq("id", "default");

  if (error) return fail(toMessage(error));

  /* Logo değiştiyse eskisi bucket'ta kalmasın — Faz 7'deki silme cascade'i. */
  await removeUnusedObjects(
    current?.logo_url ? [current.logo_url] : [],
    logoUrl ? [logoUrl] : [],
  );

  revalidatePath("/ayarlar");
  return ok({ ok: true });
}
