import type { Agent } from "@/types/database";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { AgentRoleBadge } from "@/components/agents/agent-role-badge";
import { Badge } from "@/components/ui/badge";

/**
 * Kapak şeridi + profil fotoğrafı.
 *
 * `/profil` ve `/personeller/[id]` AYNI BİLEŞENİ kullanıyor: ikisi de aynı
 * kaydı gösteriyor, tek fark kimin baktığı. İki ayrı başlık yazılsaydı biri
 * diğerinden saparak "kendi profilim başka görünüyor" durumunu üretirdi.
 *
 * KAPAK YOKSA GRADYAN. Boş gri bir şerit "yüklenmedi mi" izlenimi veriyordu;
 * marka renklerinden bir gradyan hem dolu görünüyor hem kapak yüklenince
 * fark ediliyor.
 */
export function AgentCover({
  agent,
  actions,
  className,
}: {
  agent: Agent;
  /** Sağ üstteki düğmeler — sayfaya göre değişiyor. */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-hairline bg-surface", className)}>
      {/* --- Kapak --- */}
      <div
        className={cn(
          "relative h-32 sm:h-44",
          agent.cover_url
            ? "bg-surface-inset"
            : "bg-gradient-to-br from-brand/30 via-violet/25 to-surface-inset",
        )}
      >
        {agent.cover_url && (
          /* `next/image` DEĞİL: kapak `avatars` bucket'ından geliyor ve
             `next.config.mjs` o hostu zaten tanıyor, ama burada tek bir
             büyük görsel var ve `fill` + `sizes` kurgusu bu tek kullanım
             için gereksiz karmaşıklık. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={agent.cover_url}
            alt=""
            className="size-full object-cover"
          />
        )}

        {/* Alt kenara doğru koyulaşan perde: açık renkli bir kapakta
            avatarın kenarı ve altındaki metin okunur kalsın. */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
      </div>

      {/* --- Kimlik --- */}
      <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
        <div className="-mt-10 shrink-0 rounded-full ring-4 ring-surface sm:-mt-12">
          <AgentAvatar
            name={agent.full_name}
            initials={agent.initials}
            src={agent.avatar_url}
            size={80}
          />
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-foreground">
              {agent.full_name}
            </h2>
            <AgentRoleBadge role={agent.role} />
            {!agent.is_active && <Badge variant="outline">Pasif</Badge>}
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {agent.title}
          </p>
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2 pb-0.5">{actions}</div>
        )}
      </div>
    </div>
  );
}
