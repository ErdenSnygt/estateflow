"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { CommissionStatus } from "@/types/database";
import {
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_TONES,
  availableCommissionTransitions,
} from "@/lib/revenue";
import { updateCommissionStatus } from "@/lib/actions/revenue";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ICONS: Record<CommissionStatus, typeof Check> = {
  pending: Clock,
  collected: Check,
  overdue: TriangleAlert,
};

/**
 * Tahsilat durumu rozeti — yöneticide açılır, danışmanda düz rozet.
 *
 * `canEdit` YETKİ KAPISI DEĞİL, yalnızca tıklanamayan bir menü göstermemek
 * için. Asıl kontrol server action'ın ilk satırında
 * (`lib/actions/revenue.ts`); RLS bu kolonu koruyamıyor, gerekçe orada.
 */
export function CommissionStatusControl({
  saleId,
  status,
  canEdit,
}: {
  saleId: string;
  status: CommissionStatus;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = React.useState(false);

  const Icon = ICONS[status];
  const badge = (
    <Badge variant={COMMISSION_STATUS_TONES[status]}>
      {isBusy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Icon className="size-3" />
      )}
      {COMMISSION_STATUS_LABELS[status]}
    </Badge>
  );

  if (!canEdit) return badge;

  const options = availableCommissionTransitions(status);

  async function change(next: CommissionStatus) {
    setIsBusy(true);
    const result = await updateCommissionStatus(saleId, next);
    setIsBusy(false);

    if (!result.ok) {
      toast.error("Durum değiştirilemedi", { description: result.error });
      return;
    }

    toast.success(`Komisyon "${COMMISSION_STATUS_LABELS[next]}" olarak işaretlendi`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isBusy}>
        <button
          type="button"
          aria-label={`Tahsilat durumu: ${COMMISSION_STATUS_LABELS[status]}. Değiştirmek için tıklayın.`}
          className="rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {badge}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuLabel>Tahsilat durumu</DropdownMenuLabel>
        {options.map((option) => {
          const OptionIcon = ICONS[option];
          return (
            <DropdownMenuItem key={option} onSelect={() => change(option)}>
              <OptionIcon />
              {COMMISSION_STATUS_LABELS[option]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
