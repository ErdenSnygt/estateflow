"use client";

import { useFormContext, type FieldValues } from "react-hook-form";
import { Lock } from "lucide-react";

import type { Agent } from "@/types/database";
import { AGENT_ROLE_LABELS, AGENT_ROLE_TONES } from "@/lib/agents";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
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

/**
 * "Sorumlu danışman" alanı — ilan ve müşteri formlarının ortak parçası.
 *
 * FAZ 6'DA DEĞİŞEN DAVRANIŞ: alan artık boş başlamıyor. Faz 5'te her kayıtta
 * listeden bir danışman seçmek gerekiyordu; bu hem gereksiz bir adımdı hem de
 * yanlış atama yapmayı kolaylaştırıyordu. Artık varsayılan giriş yapan kişi.
 *
 *  · Yönetici (patron / ofis müdürü) → açılır liste, başkasına atayabilir.
 *  · Danışman                        → kendi adı, kilitli.
 *
 * Kilit KOZMETİK DEĞİL, ikinci savunma hattı: bir danışman formu atlatıp
 * başka bir `agent_id` gönderse RLS'in `with check` kısmı yazmayı reddeder
 * (`0002_agents_auth_link.sql`). Buradaki kilidin işi kullanıcıya
 * yapamayacağı bir şeyi teklif etmemek.
 *
 * `useFormContext` kullanılıyor çünkü iki form farklı değer tiplerine sahip;
 * `control` prop olarak geçirilse bileşen ya generic ya da `any` olurdu.
 * Alanın adı da formlar arasında değişiyor (`agent_id` /
 * `assigned_agent_id`), bu yüzden parametre.
 */
export function AgentField({
  name,
  label,
  description,
  agents,
  currentAgent,
  canReassign,
  className,
}: {
  name: string;
  label: string;
  description?: string;
  /** RLS zaten filtreler: danışman bu listede yalnızca kendini görür. */
  agents: Agent[];
  currentAgent: Agent | null;
  canReassign: boolean;
  className?: string;
}) {
  const form = useFormContext<FieldValues>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        /* Kilitli görünümde gösterilecek kişi, formdaki DEĞERE göre bulunur —
           düzenlenen kayıt başkasına aitse onun adı çıkmalı, giriş yapanın
           değil. */
        const selected =
          agents.find((agent) => agent.id === field.value) ?? currentAgent;

        return (
          <FormItem className={className}>
            <FormLabel>{label}</FormLabel>

            {canReassign ? (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Danışman seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name} · {agent.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-inset px-3 py-2.5">
                <Avatar className="size-8">
                  <AvatarFallback className="text-[11.5px]">
                    {selected?.initials ?? "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-foreground">
                    {selected?.full_name ?? "Atanmamış"}
                  </p>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {selected?.title ?? "Personel kaydı bulunamadı"}
                  </p>
                </div>

                {selected && (
                  <Badge variant={AGENT_ROLE_TONES[selected.role]}>
                    {AGENT_ROLE_LABELS[selected.role]}
                  </Badge>
                )}

                <Lock
                  aria-label="Bu alanı yalnızca yöneticiler değiştirebilir"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              </div>
            )}

            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
