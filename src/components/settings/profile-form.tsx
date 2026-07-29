"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
      toast.error("Profil kaydedilemedi", { description: result.error });
      return;
    }

    toast.success("Profil güncellendi");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label>Profil fotoğrafı</Label>
        <AvatarUpload
          value={avatarUrl}
          onChange={setAvatarUrl}
          name={fullName}
          initials={agent.initials}
        />
      </div>

      <div className="space-y-2">
        <Label>Kapak görseli</Label>
        <CoverUpload value={coverUrl} onChange={setCoverUrl} />
        <p className="text-[11.5px] text-muted-foreground">
          Profil sayfanızın üst şeridinde görünür. Geniş bir görsel seçin.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Ad soyad</Label>
          <Input
            id="profile-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ad Soyad"
          />
          <p className="text-[11.5px] text-muted-foreground">
            Baş harfler (avatar yedeği) bu addan türetilir.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-title">Unvan</Label>
          <Input
            id="profile-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Örn. Kıdemli Portföy Danışmanı"
          />
          <p className="text-[11.5px] text-muted-foreground">
            Görünen unvan; yetki seviyeniz ayrı bir alandır.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-phone">Telefon</Label>
          <Input
            id="profile-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0532 000 00 00"
            inputMode="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">E-posta</Label>
          <Input
            id="profile-email"
            value={agent.email}
            readOnly
            disabled
            aria-describedby="profile-email-hint"
          />
          <p id="profile-email-hint" className="text-[11.5px] text-muted-foreground">
            E-posta aynı zamanda giriş kimliğiniz; değiştirilmesi doğrulama
            akışı gerektiriyor ve şu an kapsam dışı.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving || !isDirty}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Kaydediliyor…
            </>
          ) : (
            "Değişiklikleri kaydet"
          )}
        </Button>
      </div>
    </form>
  );
}
