import { z } from "zod";

import type { ListingInsert } from "@/types/database";
import { isResidential } from "@/lib/listings";

/**
 * İlan formunun doğrulama şeması.
 *
 * Sayısal alanlar bilerek `string` tutulur: HTML input'ları zaten string
 * döndürür ve `z.coerce` kullanıldığında boş alan 0'a dönüşüp "zorunlu"
 * hatası yerine yanıltıcı bir mesaj üretir. Sunucuya gönderilmeden önce
 * `toListingInput` ile sayıya çevrilir.
 */

const numericField = (label: string) =>
  z
    .string()
    .min(1, `${label} zorunludur.`)
    .refine((value) => Number.isFinite(Number(value)), "Yalnızca sayı girin.")
    .refine((value) => Number(value) > 0, `${label} 0'dan büyük olmalıdır.`);

export const listingFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(10, "Başlık en az 10 karakter olmalıdır.")
      .max(120, "Başlık en fazla 120 karakter olabilir."),
    description: z
      .string()
      .trim()
      .min(30, "Açıklama en az 30 karakter olmalıdır.")
      .max(2000, "Açıklama en fazla 2000 karakter olabilir."),
    category: z.enum(["satilik", "kiralik", "arsa", "villa", "ofis"]),
    status: z.enum(["aktif", "pasif", "taslak", "satildi"]),

    city: z.string().min(1, "Şehir seçin."),
    district: z.string().min(1, "İlçe seçin."),
    address: z.string().trim().min(5, "Açık adres girin."),

    /* Faz 5'te eklendi: `listings.agent_id` NOT NULL. Alan formda yokken
       elle eklenen her ilan danışmansız kalıyordu. */
    agent_id: z.string().min(1, "Portföy danışmanı seçin."),

    price: numericField("Fiyat"),
    currency: z.enum(["TRY", "USD", "EUR"]),
    area_sqm: numericField("Alan"),
    /** Konut dışı kategorilerde boş bırakılabilir. */
    room_count: z.string(),

    images: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (isResidential(data.category)) {
      const rooms = Number(data.room_count);
      if (!data.room_count || !Number.isFinite(rooms) || rooms < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["room_count"],
          message: "Konut ilanlarında oda sayısı zorunludur.",
        });
      }
    }

    // Yayına alınan ilanın görselsiz olması portallarda reddedilme sebebidir.
    if (data.status === "aktif" && data.images.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message:
          "Aktif ilanlar için en az bir görsel gerekir. Görsel eklemeden kaydetmek isterseniz durumu Taslak seçin.",
      });
    }
  });

export type ListingFormValues = z.infer<typeof listingFormSchema>;

/** Form değerlerini veritabanı şekline çevirir. */
export function toListingInput(values: ListingFormValues): ListingInsert {
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    status: values.status,
    city: values.city,
    district: values.district,
    address: values.address,
    price: Number(values.price),
    currency: values.currency,
    area_sqm: Number(values.area_sqm),
    room_count: values.room_count ? Number(values.room_count) : 0,
    images: values.images,
    agent_id: values.agent_id,
  };
}
