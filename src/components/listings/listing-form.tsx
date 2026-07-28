"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import type { Agent, Listing } from "@/types/database";
import { createListing, updateListing } from "@/lib/actions/listings";
import {
  listingFormSchema,
  toListingInput,
  type ListingFormValues,
} from "@/lib/listings-schema";
import {
  CATEGORY_OPTIONS,
  CITY_OPTIONS,
  ROOM_OPTIONS,
  STATUS_OPTIONS,
  districtsOf,
  isResidential,
} from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageDropzone } from "@/components/listings/image-dropzone";
import { AgentField } from "@/components/agents/agent-field";

const EMPTY_VALUES: ListingFormValues = {
  title: "",
  description: "",
  category: "satilik",
  status: "taslak",
  city: "",
  district: "",
  address: "",
  agent_id: "",
  price: "",
  currency: "TRY",
  area_sqm: "",
  room_count: "",
  images: [],
};

function toFormValues(listing: Listing): ListingFormValues {
  return {
    title: listing.title,
    description: listing.description,
    category: listing.category,
    status: listing.status,
    city: listing.city,
    district: listing.district,
    address: listing.address,
    agent_id: listing.agent_id,
    price: String(listing.price),
    currency: listing.currency,
    area_sqm: String(listing.area_sqm),
    room_count: listing.room_count ? String(listing.room_count) : "",
    images: listing.images,
  };
}

/**
 * Hem yeni kayıt hem düzenleme için kullanılır — ayrım yalnızca varsayılan
 * değerler, çağrılan action ve gönderim sonrası mesajda. Müşteri formu
 * (`components/customers/customer-form.tsx`) bu iskeleti tekrar kullanıyor.
 */
export function ListingForm({
  listing,
  agents,
  currentAgent,
  canReassign,
}: {
  listing?: Listing;
  agents: Agent[];
  /** Giriş yapan kişinin personel kaydı; yeni ilanın varsayılan sorumlusu. */
  currentAgent: Agent | null;
  canReassign: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(listing);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: listing
      ? toFormValues(listing)
      : /* Yeni ilan giriş yapan kişiye atanır. Faz 5'te bu alan boş
           başlıyordu ve her kayıtta listeden seçim yapmak gerekiyordu. */
        { ...EMPTY_VALUES, agent_id: currentAgent?.id ?? "" },
    mode: "onBlur",
  });

  const category = form.watch("category");
  const city = form.watch("city");
  const showRooms = isResidential(category);

  async function onSubmit(values: ListingFormValues) {
    const payload = toListingInput(values);

    const result = listing
      ? await updateListing(listing.id, payload)
      : await createListing(payload);

    /* Bildirim gerçek sonucu yansıtır: action `redirect()` çağırmadığı için
       hata mesajı buraya ulaşabiliyor. Gerekçe `lib/actions/result.ts`. */
    if (!result.ok) {
      toast.error(isEdit ? "İlan güncellenemedi" : "İlan kaydedilemedi", {
        description: result.error,
      });
      return;
    }

    toast.success(isEdit ? "İlan güncellendi" : "İlan oluşturuldu", {
      description: `${result.data.id.toUpperCase()} · ${values.title}`,
    });

    router.push(isEdit ? `/ilanlar/${result.data.id}` : "/ilanlar");
    /* Sunucu bileşenlerinin önbelleğe alınmış çıktısı tazelensin. */
    router.refresh();
  }

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* --- Temel bilgiler --- */}
        <FormSection
          title="Temel Bilgiler"
          description="İlanın portallarda görünecek başlığı ve tanıtım metni."
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Başlık</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Örn. Deniz Manzaralı 3+1 Daire"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Konum ve öne çıkan özelliği içeren başlıklar daha çok
                  görüntülenir.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durum</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Açıklama</FormLabel>
                <FormControl>
                  <Textarea
                    rows={7}
                    placeholder="Konumu, yapı özelliklerini ve çevredeki olanakları anlatın…"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length ?? 0} / 2000 karakter
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* --- Konum --- */}
        <FormSection
          title="Konum"
          description="Adres bilgisi ilan detayında ve haritada gösterilir."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şehir</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Şehir değişince önceki ilçe geçersiz kalır.
                      form.setValue("district", "", { shouldValidate: false });
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Şehir seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İlçe</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!city}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={city ? "İlçe seçin" : "Önce şehir seçin"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {districtsOf(city).map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Açık adres</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Mahalle, sokak ve kapı numarası"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Harita işareti şimdilik ilçe merkezine düşer; koordinat
                  seçici ayrı bir fazda gelecek.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* --- Sorumluluk --- */}
        <FormSection
          title="Portföy Sorumlusu"
          description="İlanı takip edecek danışman. İlan detayında iletişim kartı olarak gösterilir."
        >
          <AgentField
            name="agent_id"
            label="Danışman"
            description={
              canReassign
                ? "Varsayılan olarak siz atandınız; ekipten başka birine devredebilirsiniz."
                : "İlanlar kendi portföyünüze kaydedilir."
            }
            agents={agents}
            currentAgent={currentAgent}
            canReassign={canReassign}
            className="sm:max-w-[380px]"
          />
        </FormSection>

        {/* --- Fiyat & detaylar --- */}
        <FormSection
          title="Fiyat & Detaylar"
          description="Kiralık ilanlarda fiyat aylık kira bedeli olarak gösterilir."
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Fiyat</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para birimi</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TRY">₺ TRY</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="area_sqm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alan (m²)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showRooms && (
              <FormField
                control={form.control}
                name="room_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oda sayısı</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROOM_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </FormSection>

        {/* --- Fotoğraflar --- */}
        <FormSection
          title="Fotoğraflar"
          description="İlk görsel kapak olarak kullanılır. Yükleme şu an yerel önizlemedir."
        >
          <FormField
            control={form.control}
            name="images"
            render={({ field, fieldState }) => (
              <FormItem>
                <ImageDropzone
                  value={field.value}
                  onChange={field.onChange}
                  invalid={Boolean(fieldState.error)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* --- Aksiyonlar --- */}
        <div className="flex items-center justify-end gap-2 border-t border-hairline pt-5">
          <Button variant="ghost" asChild>
            <Link href={isEdit ? `/ilanlar/${listing?.id}` : "/ilanlar"}>
              Vazgeç
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Kaydediliyor…
              </>
            ) : (
              <>
                <Save className="size-4" />
                {isEdit ? "Değişiklikleri kaydet" : "İlanı kaydet"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* -------------------------------------------------------------------------- */

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-1">
          <h3 className="text-[14.5px] font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="space-y-5">{children}</div>
      </CardContent>
    </Card>
  );
}
