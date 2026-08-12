import { z } from "zod";

import type { ListingInsert } from "@/types/database";
import { isResidential } from "@/lib/listings";

/**
 * ============================================================================
 * İLAN FORMUNUN DOĞRULAMA ŞEMASI
 * ============================================================================
 * Sayısal alanlar bilerek `string` tutulur: HTML input'ları zaten string
 * döndürür ve `z.coerce` kullanıldığında boş alan 0'a dönüşüp "zorunlu"
 * hatası yerine yanıltıcı bir mesaj üretir. Sunucuya gönderilmeden önce
 * `toListingInput` ile sayıya çevrilir.
 *
 * -----------------------------------------------------------------------------
 * FAZ 20: ŞEMA ARTIK BİR FABRİKA
 * -----------------------------------------------------------------------------
 * Önceki sürüm modül düzeyinde tek bir `listingFormSchema` sabitiydi ve hata
 * mesajları Türkçe olarak içine gömülüydü. Mesajlar çeviriye taşınınca bu
 * mümkün olmadı: şema modül yüklenirken kuruluyor, çeviri ise isteğe
 * (kullanıcının diline) bağlı.
 *
 * Çözüm, şemayı bir çeviri fonksiyonu alan FABRİKAYA çevirmek. Form onu
 * `useMemo` içinde kuruyor; dil değişirse şema da yeniden kuruluyor ve
 * doğrulama mesajları yeni dilde çıkıyor.
 *
 * Alternatif, hata mesajı yerine ANAHTAR döndürüp çeviriyi `FormMessage`
 * içinde yapmaktı. O da çalışırdı ama `{label}` gibi değişken taşıyan
 * mesajlarda (bkz. `numericField`) anahtarın yanında parametreleri de
 * taşımak gerekirdi — zod'un `message` alanı düz metin.
 */

/**
 * Fabrikanın beklediği çeviri fonksiyonu.
 *
 * `useTranslations("listings.validation")` ve `getTranslations(...)` çıktısı
 * bu şekle uyuyor. GENİŞ TUTULDU (kendi tipimiz, next-intl'inki değil):
 * `schemas.test.ts` şemayı sahte bir `t` ile kurabilsin diye — test için
 * next-intl sağlayıcısı ayağa kaldırmak gerekmiyor.
 */
export type ValidationKey =
  | "titleMin"
  | "titleMax"
  | "descriptionMin"
  | "descriptionMax"
  | "cityRequired"
  | "districtRequired"
  | "addressRequired"
  | "agentRequired"
  | "required"
  | "numberOnly"
  | "positive"
  | "roomsRequired"
  | "imagesRequired";

export type ValidationTranslator = (
  key: ValidationKey,
  values?: Record<string, string | number>,
) => string;

const numericField = (t: ValidationTranslator, label: string) =>
  z
    .string()
    .min(1, t("required", { label }))
    .refine((value) => Number.isFinite(Number(value)), t("numberOnly"))
    .refine((value) => Number(value) > 0, t("positive", { label }));

/**
 * Şemayı aktif dilin mesajlarıyla kurar.
 *
 * `labels` ayrı geçiliyor: "Fiyat zorunludur." cümlesindeki alan adı, formun
 * etiketiyle (`listings.form.priceLabel`) aynı olmalı — doğrulama sözlüğünde
 * ikinci bir kopyasını tutmak, ikisinin birbirinden sapmasına açık kapı
 * bırakırdı.
 */
export function createListingFormSchema(
  t: ValidationTranslator,
  labels: { price: string; area: string },
) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(10, t("titleMin"))
        .max(120, t("titleMax")),
      description: z
        .string()
        .trim()
        .min(30, t("descriptionMin"))
        .max(2000, t("descriptionMax")),
      category: z.enum(["satilik", "kiralik", "arsa", "villa", "ofis"]),
      status: z.enum(["aktif", "pasif", "taslak", "satildi"]),

      city: z.string().min(1, t("cityRequired")),
      district: z.string().min(1, t("districtRequired")),
      address: z.string().trim().min(5, t("addressRequired")),

      /* Faz 5'te eklendi: `listings.agent_id` NOT NULL. Alan formda yokken
         elle eklenen her ilan danışmansız kalıyordu. */
      agent_id: z.string().min(1, t("agentRequired")),

      price: numericField(t, labels.price),
      currency: z.enum(["TRY", "USD", "EUR"]),
      area_sqm: numericField(t, labels.area),
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
            message: t("roomsRequired"),
          });
        }
      }

      // Yayına alınan ilanın görselsiz olması portallarda reddedilme sebebidir.
      if (data.status === "aktif" && data.images.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["images"],
          message: t("imagesRequired"),
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
export type ListingFormValues = z.infer<
  ReturnType<typeof createListingFormSchema>
>;

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
