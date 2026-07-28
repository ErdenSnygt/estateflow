"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { AGENT_ROLE_LABELS } from "@/lib/agents";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AgentRoleBadge } from "@/components/agents/agent-role-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSessionUser } from "@/components/layout/session-provider";

/**
 * Sidebar üstündeki kullanıcı kartı. Kart tıklanabilir ama henüz işlevsiz;
 * hesap menüsü navbar'daki avatarda duruyor.
 *
 * Durum göstergesi sabit "çevrimiçi": oturumu açık olan kullanıcının kendisini
 * gösteriyor. Gerçek varlık bilgisi (uzakta / çevrimdışı) bir presence
 * kanalı ister, o da Mesajlar modülüyle birlikte gelecek.
 */
export function UserCard({ isCollapsed }: { isCollapsed: boolean }) {
  const user = useSessionUser();

  const card = (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center rounded-xl border border-hairline bg-surface/60 text-left",
        "transition-all duration-200 ease-[var(--ease-out-quint)]",
        "hover:border-hairline-strong hover:bg-surface-hover",
        isCollapsed ? "justify-center p-1.5" : "gap-3 p-2.5",
      )}
    >
      <span className="relative shrink-0">
        <Avatar className="size-9 ring-1 ring-hairline-strong">
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-[2.5px] ring-canvas-subtle"
        />
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 size-3 animate-ping rounded-full bg-success opacity-40"
        />
      </span>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-foreground">
                {user.name}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="min-w-0 truncate text-[11.5px] text-muted-foreground">
                  {user.title}
                </span>
                {/* Unvan yetki DEĞİL — rolü düşürülmüş bir kullanıcının
                    unvanı aynı kalır. Rozet olmadan kullanıcı kendi yetki
                    seviyesini arayüzün hiçbir yerinden okuyamıyordu. */}
                {user.agentRole && (
                  <AgentRoleBadge role={user.agentRole} />
                )}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-secondary-foreground" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  if (!isCollapsed) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="right">
        <span className="block font-medium">{user.name}</span>
        <span className="block text-[11px] text-secondary-foreground">
          {user.title}
          {user.agentRole && ` · ${AGENT_ROLE_LABELS[user.agentRole]}`}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
