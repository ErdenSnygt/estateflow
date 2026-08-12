"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { CompanySettings } from "@/types/database";
import { updateCompanySettings } from "@/lib/actions/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "@/components/storage/avatar-upload";

/**
 * Ayarlar > Şirket bilgileri. Yalnızca yöneticilere gösteriliyor; asıl kapı
 * RLS (`company_settings_write`) ve action'ın ilk satırındaki rol kontrolü.
 *
 * Logo için `AvatarUpload` yeniden kullanılıyor: ikisi de tek görsellik,
 * kare önizlemeli, aynı bucket'a giden bir alan. Yuvarlak önizleme bir logo
 * için ideal değil ama ayrı bir bileşen açmayı haklı çıkaracak kadar da
 * değil — tek fark bir `border-radius`.
 */
export function CompanyForm({ settings }: { settings: CompanySettings | null }) {
  const router = useRouter();
  const t = useTranslations("settings.company");
  const tCommon = useTranslations("common");
  const [isSaving, setIsSaving] = React.useState(false);

  const [name, setName] = React.useState(settings?.name ?? "");
  const [logoUrl, setLogoUrl] = React.useState(settings?.logo_url ?? "");
  const [address, setAddress] = React.useState(settings?.address ?? "");
  const [taxOffice, setTaxOffice] = React.useState(settings?.tax_office ?? "");
  const [taxNumber, setTaxNumber] = React.useState(settings?.tax_number ?? "");
  const [phone, setPhone] = React.useState(settings?.phone ?? "");
  const [email, setEmail] = React.useState(settings?.email ?? "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    const result = await updateCompanySettings({
      name,
      logoUrl,
      address,
      taxOffice,
      taxNumber,
      phone,
      email,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(t("saveError"), { description: result.error });
      return;
    }

    toast.success(t("saved"));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label>{t("logoLabel")}</Label>
        <AvatarUpload
          value={logoUrl}
          onChange={setLogoUrl}
          name={name || t("fallbackName")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="company-name">{t("nameLabel")}</Label>
          <Input
            id="company-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="company-address">{t("addressLabel")}</Label>
          <Textarea
            id="company-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder={t("addressPlaceholder")}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-tax-office">{t("taxOfficeLabel")}</Label>
          <Input
            id="company-tax-office"
            value={taxOffice}
            onChange={(event) => setTaxOffice(event.target.value)}
            placeholder={t("taxOfficePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-tax-number">{t("taxNumberLabel")}</Label>
          <Input
            id="company-tax-number"
            value={taxNumber}
            onChange={(event) => setTaxNumber(event.target.value)}
            placeholder="0000000000"
            inputMode="numeric"
            className="tabular-nums"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-phone">{t("phoneLabel")}</Label>
          <Input
            id="company-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={t("phonePlaceholder")}
            inputMode="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-email">{t("emailLabel")}</Label>
          <Input
            id="company-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </div>
    </form>
  );
}
