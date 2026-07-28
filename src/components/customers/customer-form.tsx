"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import type { Agent, Customer } from "@/types/database";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import {
  EMPTY_CUSTOMER_VALUES,
  customerFormSchema,
  toCustomerFormValues,
  toCustomerInput,
  type CustomerFormValues,
} from "@/lib/customers-schema";
import { CUSTOMER_STATUS_OPTIONS } from "@/lib/customers";
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
import { AvatarUpload } from "@/components/storage/avatar-upload";

/** "Zeynep Arslan" → "ZA". Yalnızca yükleme alanının yedeği için. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

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
  const isEdit = Boolean(customer);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
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
      toast.error(isEdit ? "Müşteri güncellenemedi" : "Müşteri kaydedilemedi", {
        description: result.error,
      });
      return;
    }

    toast.success(isEdit ? "Müşteri güncellendi" : "Müşteri oluşturuldu", {
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
          title="Kimlik Bilgileri"
          description="Müşteri kartında ve arama sonuçlarında gösterilecek temel bilgiler."
        >
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ad soyad</FormLabel>
                <FormControl>
                  <Input placeholder="Örn. Zeynep Arslan" {...field} />
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
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="+90 532 000 00 00"
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
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="ornek@eposta.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="avatar_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profil fotoğrafı</FormLabel>
                {/* Faz 7'ye kadar burada bir URL metin kutusu vardı — kullanıcıdan
                    elle adres yapıştırması bekleniyordu. Artık gerçek yükleme. */}
                <AvatarUpload
                  value={field.value}
                  onChange={field.onChange}
                  name={form.watch("full_name") || "Müşteri"}
                  initials={initialsOf(form.watch("full_name"))}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* --- Bütçe ve durum --- */}
        <FormSection
          title="Bütçe & Durum"
          description="Bütçe aralığı, ilan eşleştirmesinde ve müşteri filtrelerinde kullanılır."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="budget_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alt bütçe (₺)</FormLabel>
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
                  <FormLabel>Üst bütçe (₺)</FormLabel>
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
                  <FormLabel>İlgi durumu</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOMER_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Sıcak müşteriler listede öne çıkar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AgentField
              name="assigned_agent_id"
              label="Sorumlu danışman"
              description={
                canReassign
                  ? "Varsayılan olarak siz atandınız."
                  : "Müşteri kendi portföyünüze kaydedilir."
              }
              agents={agents}
              currentAgent={currentAgent}
              canReassign={canReassign}
            />
          </div>
        </FormSection>

        {/* --- Notlar --- */}
        <FormSection
          title="Notlar"
          description="Ne aradığı, hangi koşullarda karar verdiği — ekibin geri kalanı bu notu okuyacak."
        >
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Görüşme notu</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    placeholder="Örn. Kadıköy tarafında, metroya yürüme mesafesinde 3+1 arıyor. Kredi ön onayı alındı."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length ?? 0} / 1000 karakter
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
                {isEdit ? "Değişiklikleri kaydet" : "Müşteriyi kaydet"}
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
