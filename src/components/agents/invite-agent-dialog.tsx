"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Copy, KeyRound, Loader2, TriangleAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";

import type { AgentRole } from "@/types/database";
import { AGENT_ROLES } from "@/lib/agents";
import { inviteAgent, type InviteResult } from "@/lib/auth/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Personel daveti.
 *
 * İKİ AŞAMALI: form → sonuç. Sonuç ekranı geçici şifreyi BİR KEZ gösteriyor ve
 * bu bilinçli — şifre hiçbir yere kaydedilmiyor, sunucu da onu bir daha
 * üretemiyor. Diyalog kapandığında kaybolur.
 *
 * Neden e-posta değil: Supabase'in yerleşik SMTP'si saatte birkaç e-postayla
 * sınırlı ve yapılandırılmamış bir kurulumda davet SESSİZCE düşerdi — yönetici
 * "gönderildi" görür, personel hiçbir şey almazdı. Ayrıntı
 * `lib/auth/admin-actions.ts` başlığında.
 */
export function InviteAgentDialog({
  canAssignPatron,
}: {
  /** Yalnızca patron, patron rolü atayabilir. */
  canAssignPatron: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("agents");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [result, setResult] = React.useState<InviteResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  /* ÖN DOLGU SÖZLÜKTEN, sunucu yedeği DEĞİL. `agents.title` serbest metin ve
     kullanıcının kaydettiği şey; İngilizce arayüzde çalışan bir yönetici
     "Real Estate Agent" yazmak ister. Alan tamamen boşaltılırsa devreye giren
     sunucu varsayılanı (`admin-actions.ts`) ise tek ve sabit bir Türkçe değer
     — orası veriye ait, burası arayüze. */
  const defaultTitle = t("invite.defaultTitle");

  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [title, setTitle] = React.useState(defaultTitle);
  const [role, setRole] = React.useState<AgentRole>("danisman");
  const [commission, setCommission] = React.useState("2.0");

  const roleOptions = AGENT_ROLES.filter(
    (value) => canAssignPatron || value !== "patron",
  );

  function reset() {
    setIsOpen(false);
    /* Sonuç ekranı kapanınca temizleniyor — şifre bellekte kalmasın. */
    setResult(null);
    setCopied(false);
    setEmail("");
    setFullName("");
    setTitle(defaultTitle);
    setRole("danisman");
    setCommission("2.0");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const rate = Number(commission) / 100;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      toast.error(t("form.invalidRate"), {
        description: t("form.invalidRateHint"),
      });
      return;
    }

    setIsSaving(true);
    const outcome = await inviteAgent({
      email,
      fullName,
      title,
      role,
      commissionRate: rate,
    });
    setIsSaving(false);

    if (!outcome.ok) {
      toast.error(t("invite.error"), { description: outcome.error });
      return;
    }

    setResult(outcome.data);
    router.refresh();
  }

  async function copyPassword() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("invite.copyError"), {
        description: t("invite.copyErrorHint"),
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          {t("invite.trigger")}
        </Button>
      </DialogTrigger>

      <DialogContent showCloseButton={!result}>
        {result ? (
          /* --- Sonuç: tek seferlik şifre --- */
          <>
            <DialogHeader>
              <DialogTitle>{t("invite.resultTitle")}</DialogTitle>
              <DialogDescription>
                {t("invite.resultDescription", { email: result.email })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-[12.5px] leading-relaxed text-secondary-foreground">
                  {/* Vurgu cümlenin ORTASINDA ve yeri dile göre değişiyor;
                      bu yüzden iki parçaya bölünmeden `t.rich` ile. */}
                  {t.rich("invite.warning", {
                    b: (chunks) => (
                      <strong className="text-foreground">{chunks}</strong>
                    ),
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t("invite.passwordLabel")}</Label>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-hairline bg-surface-inset px-3 py-2.5 font-mono text-[14px] tracking-wide text-foreground">
                    {result.temporaryPassword}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={copyPassword}
                    aria-label={t("invite.copyAria")}
                  >
                    {copied ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {t("invite.passwordHint")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={reset}>{tCommon("close")}</Button>
            </DialogFooter>
          </>
        ) : (
          /* --- Form --- */
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{t("invite.formTitle")}</DialogTitle>
              <DialogDescription>
                {t("invite.formDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">{t("form.nameLabel")}</Label>
                <Input
                  id="invite-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={t("invite.namePlaceholder")}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-email">{t("form.emailLabel")}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("invite.emailPlaceholder")}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-title">{t("form.titleLabel")}</Label>
                <Input
                  id="invite-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={defaultTitle}
                />
                <p className="text-[12px] text-muted-foreground">
                  {t("invite.titleHint")}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("form.roleLabel")}</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as AgentRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`role.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {role === "danisman" && (
                    <p className="text-[12px] text-muted-foreground">
                      {t("invite.roleHintAgent")}
                    </p>
                  )}
                  {role !== "danisman" && (
                    <p className="text-[12px] text-warning">
                      {t("invite.roleHintManager", { role: t(`role.${role}`) })}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-commission">
                    {t("form.commissionLabel")}
                  </Label>
                  <Input
                    id="invite-commission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={commission}
                    onChange={(event) => setCommission(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={reset}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("invite.submitting")}
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    {t("invite.submit")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
