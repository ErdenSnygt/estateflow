"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import type { Agent, Listing } from "@/types/database";
import { createListing, updateListing } from "@/lib/actions/listings";
import {
  createListingFormSchema,
  toListingInput,
  type ListingFormValues,
} from "@/lib/listings-schema";
import {
  CITY_OPTIONS,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  ROOM_OPEN_ENDED,
  ROOM_VALUES,
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
  const t = useTranslations("listings");
  const tAgent = useTranslations("agentField");

  /* ŞEMA `useMemo` İÇİNDE: doğrulama mesajları çeviriden geliyor, yani şema
     artık dile bağlı (gerekçe `lib/listings-schema.ts` başlığında). Her
     render'da yeniden kurulsaydı `zodResolver` her seferinde yeni bir referans
     alır ve react-hook-form gereksiz yere yeniden doğrulardı. */
  const schema = React.useMemo(
    () =>
      createListingFormSchema(
        (key, values) => t(`validation.${key}`, values),
        { price: t("form.priceLabel"), area: t("form.areaLabel") },
      ),
    [t],
  );

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: listing
      ? toFormValues(listing)
      : /* Yeni ilan giriş yapan kişiye atanır. Faz 5'te bu alan boş
           başlıyordu ve her kayıtta listeden seçim yapmak gerekiyordu. */
        { ...EMPTY_VALUES, agent_id: currentAgent?.id ?? "" },
    mode: "onBlur",
  });

  /* Seçenek listeleri çevrilmiş etiketlerle burada kuruluyor — `lib/listings.ts`
     yalnızca sıralı anahtarları veriyor (Faz 20). */
  const categoryOptions = LISTING_CATEGORIES.map((value) => ({
    value,
    label: t(`category.${value}`),
  }));
  const statusOptions = LISTING_STATUSES.map((value) => ({
    value,
    label: t(`status.${value}`),
  }));
  const roomOptions = ROOM_VALUES.map((value) => ({
    value,
    label:
      value === ROOM_OPEN_ENDED
        ? t("rooms.andAbove", { value: `${value}+1` })
        : `${value}+1`,
  }));

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
      toast.error(
        t(isEdit ? "form.updateErrorTitle" : "form.createErrorTitle"),
        {
          description: result.error,
        },
      );
      return;
    }

    toast.success(t(isEdit ? "form.updatedTitle" : "form.createdTitle"), {
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
          title={t("form.basicsTitle")}
          description={t("form.basicsDescription")}
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.titleLabel")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("form.titlePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("form.titleHint")}</FormDescription>
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
                  <FormLabel>{t("form.categoryLabel")}</FormLabel>
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
                      {categoryOptions.map((option) => (
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
                  <FormLabel>{t("form.statusLabel")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
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
                <FormLabel>{t("form.descriptionLabel")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={7}
                    placeholder={t("form.descriptionPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t("form.descriptionCounter", {
                    count: field.value?.length ?? 0,
                  })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* --- Konum --- */}
        <FormSection
          title={t("form.locationTitle")}
          description={t("form.locationDescription")}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.cityLabel")}</FormLabel>
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
                        <SelectValue placeholder={t("form.cityPlaceholder")} />
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
                  <FormLabel>{t("form.districtLabel")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!city}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                        city
                          ? "form.districtPlaceholder"
                          : "form.districtDisabled",
                      )}
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
                <FormLabel>{t("form.addressLabel")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("form.addressPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("form.addressHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* --- Sorumluluk --- */}
        <FormSection
          title={t("form.agentTitle")}
          description={t("form.agentDescription")}
        >
          <AgentField
            name="agent_id"
            label={tAgent("label")}
            description={
              canReassign
                ? tAgent("hintSelf")
                : t("form.agentHintSelf")
            }
            agents={agents}
            currentAgent={currentAgent}
            canReassign={canReassign}
            className="sm:max-w-[380px]"
          />
        </FormSection>

        {/* --- Fiyat & detaylar --- */}
        <FormSection
          title={t("form.priceTitle")}
          description={t("form.priceDescription")}
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t("form.priceLabel")}</FormLabel>
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
                  <FormLabel>{t("form.currencyLabel")}</FormLabel>
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
                  <FormLabel>{t("form.areaLabel")}</FormLabel>
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
                    <FormLabel>{t("form.roomsLabel")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.roomsPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roomOptions.map((option) => (
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
          title={t("form.photosTitle")}
          description={t("form.photosDescription")}
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
              {t("form.cancel")}
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("form.saving")}
              </>
            ) : (
              <>
                <Save className="size-4" />
                {t(isEdit ? "form.saveEdit" : "form.saveNew")}
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
