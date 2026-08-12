"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import type { Agent, Customer } from "@/types/database";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import {
  EMPTY_CUSTOMER_VALUES,
  createCustomerFormSchema,
  toCustomerFormValues,
  toCustomerInput,
  type CustomerFormValues,
} from "@/lib/customers-schema";
import { CUSTOMER_STATUSES } from "@/lib/customers";
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
import { AgentField } from "@/components/agents/agent-field";

/**
 * Müşteri formu.
 *
 * İLANLAR FORMUNUN İSKELETİ AYNEN TEKRAR KULLANILIYOR: aynı `FormSection`
 * düzeni, aynı react-hook-form + zodResolver kurulumu, aynı "sayısal alanlar
 * string" kuralı, aynı server action → sonuç nesnesi → toast → yönlendirme
 * zinciri. Farklar yalnızca alanlarda.
 *
 * `FormSection` bilinçli olarak paylaşılmadı: iki modülde de dokuz satırlık
 * sunum kabuğu ve ortaklaştırmak için bir `components/form/` katmanı açmak
 * gerekirdi. Davranış taşıyan hiçbir şey kopyalanmıyor — şema, action ve
 * sonuç sözleşmesi ortak.
 */
export function CustomerForm({
  customer,
  agents,
  currentAgent,
  canReassign,
}: {
  customer?: Customer;
  agents: Agent[];
  /** Giriş yapan kişinin personel kaydı; yeni müşterinin varsayılan sorumlusu. */
  currentAgent: Agent | null;
  canReassign: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("customers.form");
  const tValidation = useTranslations("customers.validation");
  const tStatus = useTranslations("customers.status");
  const tCommon = useTranslations("common");
  const isEdit = Boolean(customer);

  /**
   * Şema DİLE BAĞLI, o yüzden render sırasında kuruluyor — gerekçe
   * `lib/customers-schema.ts` başlığında.
   *
   * Alan adları form etiketinden DEĞİL, doğrulama sözlüğünden geliyor
   * (`budgetMinName`). Sebebi etiketlerin birim taşıması: "Alt bütçe (₺)"
   * bir başlık olarak doğru ama "Alt bütçe (₺) zorunludur." cümlesi değil.
   * İki kopya doğuyor ama ikisi de aynı sözlük dosyasında, yan yana.
   */
  const schema = React.useMemo(
    () =>
      createCustomerFormSchema((key, values) => tValidation(key, values), {
        budgetMin: tValidation("budgetMinName"),
        budgetMax: tValidation("budgetMaxName"),
      }),
    [tValidation],
  );

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? toCustomerFormValues(customer)
      : {
          ...EMPTY_CUSTOMER_VALUES,
          assigned_agent_id: currentAgent?.id ?? "",
        },
    mode: "onBlur",
  });

  async function onSubmit(values: CustomerFormValues) {
    const payload = toCustomerInput(values);

    let result;
    if (customer) {
      /* Düzenlemede son görüşme tarihine dokunulmaz: o alan formda yok ve
         `toCustomerInput` onu null döndürüyor — göndersek geçmişi silerdik. */
      const { last_contact_at: _ignored, ...rest } = payload;
      result = await updateCustomer(customer.id, rest);
    } else {
      result = await createCustomer(payload);
    }

    if (!result.ok) {
      toast.error(t(isEdit ? "updateError" : "createError"), {
        description: result.error,
      });
      return;
    }

    toast.success(t(isEdit ? "updateSuccess" : "createSuccess"), {
      description: `${result.data.id.toUpperCase()} · ${values.full_name}`,
    });

    router.push(`/musteriler/${result.data.id}`);
    router.refresh();
  }

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* --- Kimlik --- */}
        <FormSection
          title={t("identityTitle")}
          description={t("identityDescription")}
        >
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fullNameLabel")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("fullNamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phoneLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder={t("phonePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("emailLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder={t("emailPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* PROFİL FOTOĞRAFI ALANI YOK — Faz 19'da kaldırıldı. Müşteri
              avatarı artık her yerde baş harf; gerekçe
              `components/customers/customer-avatar.tsx` başlığında. */}
        </FormSection>

        {/* --- Bütçe ve durum --- */}
        <FormSection
          title={t("budgetTitle")}
          description={t("budgetDescription")}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="budget_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("budgetMinLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={250000}
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
              name="budget_max"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("budgetMaxLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={250000}
                      inputMode="numeric"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("statusLabel")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOMER_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tStatus(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("statusHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AgentField
              name="assigned_agent_id"
              label={t("agentLabel")}
              description={t(
                canReassign ? "agentHintReassign" : "agentHintFixed",
              )}
              agents={agents}
              currentAgent={currentAgent}
              canReassign={canReassign}
            />
          </div>
        </FormSection>

        {/* --- Notlar --- */}
        <FormSection
          title={t("notesTitle")}
          description={t("notesDescription")}
        >
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("notesLabel")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    placeholder={t("notesPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t("notesCounter", { count: field.value?.length ?? 0 })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* --- Aksiyonlar --- */}
        <div className="flex items-center justify-end gap-2 border-t border-hairline pt-5">
          <Button variant="ghost" asChild>
            <Link href={isEdit ? `/musteriler/${customer?.id}` : "/musteriler"}>
              {tCommon("cancel")}
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {tCommon("saving")}
              </>
            ) : (
              <>
                <Save className="size-4" />
                {t(isEdit ? "submitEdit" : "submitNew")}
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
