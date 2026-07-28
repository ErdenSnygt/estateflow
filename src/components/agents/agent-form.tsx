"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Save } from "lucide-react";
import { toast } from "sonner";

import type { Agent, AgentRole } from "@/types/database";
import { AGENT_ROLE_LABELS, AGENT_ROLE_OPTIONS } from "@/lib/agents";
import { updateAgent } from "@/lib/auth/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarUpload } from "@/components/storage/avatar-upload";
import { AgentRoleBadge } from "@/components/agents/agent-role-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Personel düzenleme formu.
 *
 * `react-hook-form` + zod KULLANILMADI: alanların hiçbirinde alanlar arası
 * kural yok, doğrulamanın tamamı sunucuda ve orada olmak ZORUNDA (servis
 * anahtarıyla çalışan bir action'da istemci doğrulaması bir güvence değil).
 * İstemci tarafı yalnızca yazım hatasını erken yakalıyor. İlan ve müşteri
 * formları gibi onlarca alanlı yerlerde şema katmanı kuralı geçerli.
 *
 * KİLİTLİ ALANLAR: kimse kendi rolünü ve primini değiştiremez — bir ofis
 * müdürü kendini patron yapamasın, kimse kendi primini yükseltmesin. Kilit
 * burada kozmetik; asıl kontrol `admin-actions.ts` içinde ve orası aynı
 * durumu reddediyor.
 */
export function AgentForm({
  agent,
  actorId,
  actorRole,
}: {
  agent: Agent;
  actorId: string;
  actorRole: AgentRole;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);

  const [fullName, setFullName] = React.useState(agent.full_name);
  const [title, setTitle] = React.useState(agent.title);
  const [phone, setPhone] = React.useState(agent.phone);
  const [role, setRole] = React.useState<AgentRole>(agent.role);
  const [commission, setCommission] = React.useState(
    (agent.commission_rate * 100).toFixed(1),
  );
  const [avatarUrl, setAvatarUrl] = React.useState(agent.avatar_url ?? "");

  const isSelf = agent.id === actorId;
  /* Patron rolüyle ilgili değişiklikleri yalnızca patron yapabilir — hedef
     patronsa ya da patron yapılacaksa. */
  const patronLocked = actorRole !== "patron" && agent.role === "patron";
  const authorityLocked = isSelf || patronLocked;

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const rate = Number(commission) / 100;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      toast.error("Geçersiz prim oranı", {
        description: "0 ile 100 arasında bir yüzde girin.",
      });
      return;
    }
    if (fullName.trim().length < 3) {
      toast.error("Ad soyad çok kısa");
      return;
    }

    setIsSaving(true);
    const result = await updateAgent(agent.id, {
      fullName,
      title,
      phone,
      /* Kilitliyse mevcut değerler gönderiliyor: sunucu zaten değişikliği
         reddederdi, boşuna hata göstermeye gerek yok. */
      role: authorityLocked ? agent.role : role,
      commissionRate: authorityLocked ? agent.commission_rate : rate,
      avatarUrl,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error("Kaydedilemedi", { description: result.error });
      return;
    }

    toast.success("Personel güncellendi", { description: fullName });
    router.push(`/personeller/${agent.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-1">
            <h3 className="text-[14.5px] font-semibold text-foreground">
              Kimlik
            </h3>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Kartlarda ve ilan/müşteri detaylarındaki danışman kartında
              görünür.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Profil fotoğrafı</Label>
              <AvatarUpload
                value={avatarUrl}
                onChange={setAvatarUrl}
                name={fullName || agent.full_name}
                initials={agent.initials}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-name">Ad soyad</Label>
              <Input
                id="agent-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent-title">Unvan</Label>
                <Input
                  id="agent-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Gayrimenkul Danışmanı"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-phone">Telefon</Label>
                <Input
                  id="agent-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input value={agent.email} disabled />
              <p className="text-[12px] text-muted-foreground">
                Giriş hesabına bağlı; değiştirmek için yeni bir davet gerekir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-1">
            <h3 className="text-[14.5px] font-semibold text-foreground">
              Yetki & Prim
            </h3>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Rol neyi görebileceğini, prim oranı hakedişini belirler.
            </p>
          </div>

          <div className="space-y-5">
            {authorityLocked && (
              <div className="flex items-start gap-2.5 rounded-lg border border-hairline bg-surface-inset px-3.5 py-3">
                <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-[12.5px] leading-relaxed text-secondary-foreground">
                  {isSelf
                    ? "Kendi rolünüzü ve prim oranınızı değiştiremezsiniz; bunu başka bir yönetici yapmalı."
                    : "Patron rolüyle ilgili değişiklikleri yalnızca bir patron yapabilir."}
                </p>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Yetki rolü</Label>
                {authorityLocked ? (
                  <div className="flex h-10 items-center rounded-lg border border-hairline bg-surface-inset px-3">
                    <AgentRoleBadge role={agent.role} />
                  </div>
                ) : (
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as AgentRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_ROLE_OPTIONS.filter(
                        (option) =>
                          actorRole === "patron" || option.value !== "patron",
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!authorityLocked && role !== agent.role && (
                  <p className="text-[12px] text-warning">
                    {AGENT_ROLE_LABELS[agent.role]} → {AGENT_ROLE_LABELS[role]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-commission">Prim oranı (%)</Label>
                <Input
                  id="agent-commission"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={commission}
                  onChange={(event) => setCommission(event.target.value)}
                  disabled={authorityLocked}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 border-t border-hairline pt-5">
        <Button variant="ghost" asChild>
          <Link href={`/personeller/${agent.id}`}>Vazgeç</Link>
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Kaydediliyor…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Değişiklikleri kaydet
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
