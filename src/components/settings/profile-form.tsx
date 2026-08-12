"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Agent } from "@/types/database";
import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "@/components/storage/avatar-upload";
import { CoverUpload } from "@/components/settings/cover-upload";

/**
 * Ayarlar > Profil.
 *
 * E-POSTA ALANI SALT OKUNUR. `agents.email` ile `auth.users.email` ayrı
 * yaşıyor; birini değiştirip diğerini bırakmak kullanıcının giriş yapamamasına
 * yol açabilirdi. Gerçek e-posta değişimi Supabase'in doğrulama akışını
 * gerektiriyor — gerekçe `lib/actions/profile.ts` başlığında, kapsam notu
 * README'de.
 *
 * ROL VE PRİM DE BURADA YOK: ikisi de yetki/para alanı ve yalnızca yönetici
 * tarafından, ayrı bir dosyadan (`admin-actions.ts`) değiştirilebiliyor.
 */
export function ProfileForm({ agent }: { agent: Agent }) {
  const router = useRouter();
  const t = useTranslations("settings.profile");
  const tUpload = useTranslations("upload");
  const tCommon = useTranslations("common");
  const [isSaving, setIsSaving] = React.useState(false);

  const [fullName, setFullName] = React.useState(agent.full_name);
  const [title, setTitle] = React.useState(agent.title);
  const [phone, setPhone] = React.useState(agent.phone);
  const [avatarUrl, setAvatarUrl] = React.useState(agent.avatar_url ?? "");
  const [coverUrl, setCoverUrl] = React.useState(agent.cover_url ?? "");

  const isDirty =
    fullName !== agent.full_name ||
    title !== agent.title ||
    phone !== agent.phone ||
    avatarUrl !== (agent.avatar_url ?? "") ||
    coverUrl !== (agent.cover_url ?? "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    const result = await updateProfile({
      fullName,
      title,
      phone,
      avatarUrl,
      coverUrl,
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
        <Label>{tUpload("avatar.label")}</Label>
        <AvatarUpload
          value={avatarUrl}
          onChange={setAvatarUrl}
          name={fullName}
          initials={agent.initials}
        />
      </div>

      <div className="space-y-2">
        <Label>{tUpload("cover.label")}</Label>
        <CoverUpload value={coverUrl} onChange={setCoverUrl} />
        <p className="text-[11.5px] text-muted-foreground">
          {t("coverHint")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name">{t("nameLabel")}</Label>
          <Input
            id="profile-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={t("namePlaceholder")}
          />
          <p className="text-[11.5px] text-muted-foreground">
            {t("nameHint")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-title">{t("titleLabel")}</Label>
          <Input
            id="profile-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("titlePlaceholder")}
          />
          <p className="text-[11.5px] text-muted-foreground">
            {t("titleHint")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-phone">{t("phoneLabel")}</Label>
          <Input
            id="profile-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={t("phonePlaceholder")}
            inputMode="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">{t("emailLabel")}</Label>
          <Input
            id="profile-email"
            value={agent.email}
            readOnly
            disabled
            aria-describedby="profile-email-hint"
          />
          <p id="profile-email-hint" className="text-[11.5px] text-muted-foreground">
            {t("emailHint")}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving || !isDirty}>
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
