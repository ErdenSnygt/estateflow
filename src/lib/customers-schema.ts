import { z } from "zod";

import type { Customer, CustomerInsert } from "@/types/database";

/**
 * Müşteri formunun doğrulama şeması.
 *
 * `listings-schema.ts` ile aynı kural: SAYISAL ALANLAR STRING TUTULUR. HTML
 * input'ları zaten string döndürür ve `z.coerce` kullanıldığında boş alan 0'a
 * dönüşüp "zorunlu" hatası yerine yanıltıcı bir mesaj üretir. Sunucuya
 * gönderilmeden önce `toCustomerInput` ile sayıya çevrilir.
 */

const budgetField = (label: string) =>
  z
    .string()
    .min(1, `${label} zorunludur.`)
    .refine((value) => Number.isFinite(Number(value)), "Yalnızca sayı girin.")
    .refine((value) => Number(value) > 0, `${label} 0'dan büyük olmalıdır.`);

export const customerFormSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(3, "Ad soyad en az 3 karakter olmalıdır.")
      .max(80, "Ad soyad en fazla 80 karakter olabilir."),
    /* Biçim serbest: kayıtlar "+90 5xx …" düzeninde ama elle girilen numarayı
       katı bir maskeye zorlamak veri girişini yavaşlatıyor. */
    phone: z
      .string()
      .trim()
      .min(10, "Telefon numarası en az 10 karakter olmalıdır.")
      .max(24, "Telefon numarası çok uzun."),
    email: z.string().trim().email("Geçerli bir e-posta adresi girin."),

    budget_min: budgetField("Alt bütçe"),
    budget_max: budgetField("Üst bütçe"),

    status: z.enum(["sicak", "normal", "soguk"]),
    assigned_agent_id: z.string().min(1, "Sorumlu danışman seçin."),

    notes: z
      .string()
      .trim()
      .max(1000, "Not en fazla 1000 karakter olabilir."),
    /* Boş bırakılabilir; doluysa gerçekten bir URL olmalı, yoksa
       `next/image` çalışma zamanında patlar. */
    avatar_url: z
      .string()
      .trim()
      .url("Geçerli bir görsel adresi girin.")
      .or(z.literal("")),
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
        message: "Üst bütçe alt bütçeden küçük olamaz.",
      });
    }
  });

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const EMPTY_CUSTOMER_VALUES: CustomerFormValues = {
  full_name: "",
  phone: "",
  email: "",
  budget_min: "",
  budget_max: "",
  status: "normal",
  assigned_agent_id: "",
  notes: "",
  avatar_url: "",
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
    avatar_url: customer.avatar_url ?? "",
  };
}

/** Form değerlerini veritabanı şekline çevirir. */
export function toCustomerInput(values: CustomerFormValues): CustomerInsert {
  return {
    full_name: values.full_name,
    phone: values.phone,
    email: values.email,
    /* Boş metin değil null: kolon nullable ve arayüz "fotoğraf yok" durumunu
       null üzerinden ayırt ediyor. */
    avatar_url: values.avatar_url === "" ? null : values.avatar_url,
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
