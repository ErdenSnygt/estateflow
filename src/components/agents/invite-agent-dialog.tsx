"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, TriangleAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";

import type { AgentRole } from "@/types/database";
import { AGENT_ROLE_LABELS, AGENT_ROLE_OPTIONS } from "@/lib/agents";
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
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [result, setResult] = React.useState<InviteResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [title, setTitle] = React.useState("Gayrimenkul Danışmanı");
  const [role, setRole] = React.useState<AgentRole>("danisman");
  const [commission, setCommission] = React.useState("2.0");

  const roleOptions = AGENT_ROLE_OPTIONS.filter(
    (option) => canAssignPatron || option.value !== "patron",
  );

  function reset() {
    setIsOpen(false);
    /* Sonuç ekranı kapanınca temizleniyor — şifre bellekte kalmasın. */
    setResult(null);
    setCopied(false);
    setEmail("");
    setFullName("");
    setTitle("Gayrimenkul Danışmanı");
    setRole("danisman");
    setCommission("2.0");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const rate = Number(commission) / 100;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      toast.error("Geçersiz prim oranı", {
        description: "0 ile 100 arasında bir yüzde girin.",
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
      toast.error("Personel davet edilemedi", { description: outcome.error });
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
      toast.error("Panoya kopyalanamadı", {
        description: "Şifreyi elle seçip kopyalayın.",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Yeni Personel Davet Et
        </Button>
      </DialogTrigger>

      <DialogContent showCloseButton={!result}>
        {result ? (
          /* --- Sonuç: tek seferlik şifre --- */
          <>
            <DialogHeader>
              <DialogTitle>Personel oluşturuldu</DialogTitle>
              <DialogDescription>
                {result.email} adresiyle bir hesap açıldı.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-[12.5px] leading-relaxed text-secondary-foreground">
                  Bu şifre <strong className="text-foreground">yalnızca bir kez</strong>{" "}
                  gösteriliyor ve hiçbir yere kaydedilmedi. Bu pencereyi
                  kapattığınızda geri getirilemez — şimdi kopyalayıp personele
                  iletin.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Geçici şifre</Label>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-hairline bg-surface-inset px-3 py-2.5 font-mono text-[14px] tracking-wide text-foreground">
                    {result.temporaryPassword}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={copyPassword}
                    aria-label="Şifreyi kopyala"
                  >
                    {copied ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Personel bu şifreyle giriş yaptıktan sonra Ayarlar üzerinden
                  değiştirmeli.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={reset}>Kapat</Button>
            </DialogFooter>
          </>
        ) : (
          /* --- Form --- */
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Yeni personel davet et</DialogTitle>
              <DialogDescription>
                Hesap hemen oluşturulur ve size bir geçici şifre verilir.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Ad soyad</Label>
                <Input
                  id="invite-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Örn. Ayşe Yılmaz"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-email">E-posta</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ornek@emlakofisi.com"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-title">Unvan</Label>
                <Input
                  id="invite-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Gayrimenkul Danışmanı"
                />
                <p className="text-[12px] text-muted-foreground">
                  Kartlarda görünen serbest metin. Yetkiyi aşağıdaki rol
                  belirler.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Yetki rolü</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as AgentRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {role === "danisman" && (
                    <p className="text-[12px] text-muted-foreground">
                      Yalnızca kendi ilan ve müşterilerini görür.
                    </p>
                  )}
                  {role !== "danisman" && (
                    <p className="text-[12px] text-warning">
                      {AGENT_ROLE_LABELS[role]} tüm portföyü görür ve düzenler.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-commission">Prim oranı (%)</Label>
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
                Vazgeç
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Oluşturuluyor…
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    Hesabı oluştur
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
