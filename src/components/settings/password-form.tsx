"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { changePassword } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Supabase varsayılanı 6; burada daha sıkı davranıyoruz. */
const MIN_LENGTH = 8;

/**
 * Şifre değiştirme.
 *
 * MEVCUT ŞİFRE SORULUYOR ve bu bir formalite değil: Supabase'in
 * `auth.updateUser({ password })` çağrısı mevcut şifreyi istemiyor, geçerli
 * bir oturum yeterli. Açık bırakılmış bir bilgisayarda oturuma erişen biri
 * hesabı devralabilirdi. Doğrulama server action'da yapılıyor — istemcideki
 * bu alan yalnızca onu toplamak için.
 *
 * Faz 10'da davet edilen personel geçici bir şifreyle giriş yapıyordu ve onu
 * değiştirecek bir ekran yoktu; README'nin "Henüz yapılmayanlar" listesindeki
 * o madde bu formla kapanıyor.
 */
export function PasswordForm() {
  const t = useTranslations("settings.password");
  const tAuth = useTranslations("auth");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [repeat, setRepeat] = React.useState("");
  const [isVisible, setIsVisible] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const mismatch = repeat.length > 0 && newPassword !== repeat;
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_LENGTH &&
    newPassword === repeat &&
    !isSaving;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    const result = await changePassword({ currentPassword, newPassword });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(t("error"), { description: result.error });
      return;
    }

    toast.success(t("saved"), { description: t("savedHint") });
    /* Alanlar temizleniyor: şifre bir formda gereksiz yere durmamalı. */
    setCurrentPassword("");
    setNewPassword("");
    setRepeat("");
    setIsVisible(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="current-password">{t("currentLabel")}</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="sm:max-w-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">{t("newLabel")}</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={isVisible ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="pr-10"
              aria-invalid={tooShort}
            />
            <button
              type="button"
              onClick={() => setIsVisible((visible) => !visible)}
              aria-label={tAuth(isVisible ? "hidePassword" : "showPassword")}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              {isVisible ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <p
            className={
              tooShort
                ? "text-[11.5px] text-danger"
                : "text-[11.5px] text-muted-foreground"
            }
          >
            {t("minHint", { count: MIN_LENGTH })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="repeat-password">{t("repeatLabel")}</Label>
          <Input
            id="repeat-password"
            type={isVisible ? "text" : "password"}
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            aria-invalid={mismatch}
          />
          {mismatch && (
            <p className="text-[11.5px] text-danger">{t("mismatch")}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </div>
    </form>
  );
}
