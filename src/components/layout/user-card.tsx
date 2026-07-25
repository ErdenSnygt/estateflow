"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { currentUser } from "@/config/site";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusStyles: Record<typeof currentUser.status, string> = {
  online: "bg-success",
  away: "bg-warning",
  offline: "bg-muted-foreground",
};

const statusLabels: Record<typeof currentUser.status, string> = {
  online: "Çevrimiçi",
  away: "Uzakta",
  offline: "Çevrimdışı",
};

/** Sidebar üstündeki kullanıcı kartı. Faz 1'de tıklanabilir ama işlevsiz. */
export function UserCard({ isCollapsed }: { isCollapsed: boolean }) {
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
          <AvatarFallback>{currentUser.initials}</AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-[2.5px] ring-canvas-subtle",
            statusStyles[currentUser.status],
          )}
        />
        {currentUser.status === "online" && (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 size-3 animate-ping rounded-full bg-success opacity-40"
          />
        )}
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
                {currentUser.name}
              </span>
              <span className="block truncate text-[11.5px] text-muted-foreground">
                {currentUser.role}
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
        <span className="block font-medium">{currentUser.name}</span>
        <span className="block text-[11px] text-secondary-foreground">
          {currentUser.role} · {statusLabels[currentUser.status]}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
