import { z } from "zod";

import type { Customer, CustomerInsert } from "@/types/database";

/**
 * Müşteri formunun doğrulama şeması.
 *
 * `listings-schema.ts` ile aynı kural: SAYISAL ALANLAR STRING TUTULUR. HTML
 * input'ları zaten string döndürür ve `z.coerce` kullanıldığında boş alan 0'a
 * dönüşüp "zorunlu" hatası yerine yanıltıcı bir mesaj üretir. Sunucuya
 * gönderilmeden önce `toCustomerInput` ile sayıya çevrilir.
 *
 * -----------------------------------------------------------------------------
 * FAZ 21: ŞEMA ARTIK BİR FABRİKA
 * -----------------------------------------------------------------------------
 * `listings-schema.ts` Faz 20'de aynı dönüşümü geçti ve gerekçe birebir aynı:
 * mesajlar çeviriden geliyor, çeviri isteğe (kullanıcının diline) bağlı, şema
 * ise modül yüklenirken kuruluyordu. Form onu artık `useMemo` içinde kuruyor.
 */

/**
 * Fabrikanın beklediği çeviri fonksiyonu.
 *
 * GENİŞ TUTULDU (kendi tipimiz, next-intl'inki değil): `schemas.test.ts`
 * şemayı sahte bir `t` ile kurabilsin diye — test için next-intl sağlayıcısı
 * ayağa kaldırmak gerekmiyor.
 */
export type CustomerValidationKey =
  | "nameMin"
  | "nameMax"
  | "phoneMin"
  | "phoneMax"
  | "emailInvalid"
  | "required"
  | "numberOnly"
  | "positive"
  | "agentRequired"
  | "notesMax"
  | "budgetOrder";

export type CustomerValidationTranslator = (
  key: CustomerValidationKey,
  values?: Record<string, string | number>,
) => string;

const budgetField = (t: CustomerValidationTranslator, label: string) =>
  z
    .string()
    .min(1, t("required", { label }))
    .refine((value) => Number.isFinite(Number(value)), t("numberOnly"))
    .refine((value) => Number(value) > 0, t("positive", { label }));

/**
 * Şemayı aktif dilin mesajlarıyla kurar.
 *
 * `labels` ayrı geçiliyor: "Alt bütçe zorunludur." cümlesindeki alan adı,
 * formun kendi etiketiyle aynı olmalı — doğrulama sözlüğünde ikinci bir
 * kopyasını tutmak ikisinin sapmasına açık kapı bırakırdı.
 */
export function createCustomerFormSchema(
  t: CustomerValidationTranslator,
  labels: { budgetMin: string; budgetMax: string },
) {
  return z
    .object({
      full_name: z
        .string()
        .trim()
        .min(3, t("nameMin"))
        .max(80, t("nameMax")),
      /* Biçim serbest: kayıtlar "+90 5xx …" düzeninde ama elle girilen
         numarayı katı bir maskeye zorlamak veri girişini yavaşlatıyor. */
      phone: z
        .string()
        .trim()
        .min(10, t("phoneMin"))
        .max(24, t("phoneMax")),
      email: z.string().trim().email(t("emailInvalid")),

      budget_min: budgetField(t, labels.budgetMin),
      budget_max: budgetField(t, labels.budgetMax),

      status: z.enum(["sicak", "normal", "soguk"]),
      assigned_agent_id: z.string().min(1, t("agentRequired")),

      notes: z.string().trim().max(1000, t("notesMax")),
      /* PROFİL FOTOĞRAFI ALANI YOK — müşteri avatarı Faz 19'da kaldırıldı.
         Gerekçe `components/customers/customer-avatar.tsx` başlığında: bir
         emlak ofisi müşterisinin vesikalığını sisteme girmiyor, arayüz baş
         harf gösteriyor. Kolon şemada duruyor ama uygulama artık yazmıyor. */
    })
    .superRefine((data, ctx) => {
      const min = Number(data.budget_min);
      const max = Number(data.budget_max);

      /* Veritabanında da bir CHECK kısıtı var (`customers_budget_range`);
         burada yakalamak kullanıcıya alan bazlı bir mesaj vermeyi sağlıyor. */
      if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
        ctx.addIssue({
          code: "custom",
          path: ["budget_max"],
          message: t("budgetOrder"),
        });
      }
    });
}

/**
 * Form değerlerinin tipi.
 *
 * Şema artık bir fabrika olduğu için tip de ondan türetiliyor. Mesajlar tipi
 * etkilemiyor — hangi dille kurulursa kurulsun şekil aynı.
 */
export type CustomerFormValues = z.infer<
  ReturnType<typeof createCustomerFormSchema>
>;

export const EMPTY_CUSTOMER_VALUES: CustomerFormValues = {
  full_name: "",
  phone: "",
  email: "",
  budget_min: "",
  budget_max: "",
  status: "normal",
  assigned_agent_id: "",
  notes: "",
};

export function toCustomerFormValues(customer: Customer): CustomerFormValues {
  return {
    full_name: customer.full_name,
    phone: customer.phone,
    email: customer.email,
    budget_min: String(customer.budget_min),
    budget_max: String(customer.budget_max),
    status: customer.status,
    assigned_agent_id: customer.assigned_agent_id,
    notes: customer.notes,
  };
}

/** Form değerlerini veritabanı şekline çevirir. */
export function toCustomerInput(values: CustomerFormValues): CustomerInsert {
  return {
    full_name: values.full_name,
    phone: values.phone,
    email: values.email,
    /* Her zaman null: müşteri fotoğrafı kaldırıldı, kolon boş kalıyor. */
    avatar_url: null,
    budget_min: Number(values.budget_min),
    budget_max: Number(values.budget_max),
    status: values.status,
    assigned_agent_id: values.assigned_agent_id,
    notes: values.notes,
    /* Yeni kayıtta görüşme yok; düzenlemede bu alan forma girmiyor, bu yüzden
       `updateCustomer` çağrısı öncesi ayıklanıyor (bkz. customer-form.tsx). */
    last_contact_at: null,
  };
}
