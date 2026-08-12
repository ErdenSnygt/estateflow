"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  Building2,
  Check,
  Loader2,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { AppointmentItem } from "@/lib/data/appointments";
import {
  APPOINTMENT_STATUS_TONES,
  APPOINTMENT_TYPE_PALETTE,
} from "@/lib/appointments";
import {
  deleteAppointment,
  setAppointmentStatus,
} from "@/lib/actions/appointments";
import { formatTimeRange, toDateKey, formatDayLong } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

/**
 * Randevu detay paneli.
 *
 * `PopoverTrigger` DEĞİL `PopoverAnchor` kullanılıyor ve açıklık dışarıdan
 * yönetiliyor. Nedeni sürükle-bırak: tetikleyici kendi tıklama işleyicisini
 * bağlasaydı, bir randevuyu sürükleyip bıraktıktan sonra panel de açılırdı.
 * Açma kararı çipin kendisinde (sürüklendi mi, yoksa yalnızca tıklandı mı) —
 * `time-grid.tsx`.
 *
 * SİLME İÇİN AYRI DİYALOG AÇILMIYOR. Radix'te popover içinden alert diyalogu
 * açmak iki portal ve iki "dışarı tıklama" sınırı demek; ikisi birbirini
 * kapatıyor. Onay yerinde alınıyor: ilk tıklama düğmeyi "Emin misiniz?"e
 * çeviriyor, ikincisi siliyor.
 */
export function AppointmentPopover({
  appointment,
  open,
  onOpenChange,
  onEdit,
  children,
}: {
  appointment: AppointmentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (appointment: AppointmentItem) => void;
  /** Panelin tutunacağı öğe — randevu çipi. */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [isBusy, setIsBusy] = React.useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  const palette = APPOINTMENT_TYPE_PALETTE[appointment.appointment_type];

  function close() {
    setIsConfirmingDelete(false);
    onOpenChange(false);
  }

  async function changeStatus(next: AppointmentItem["status"]) {
    setIsBusy(true);
    const result = await setAppointmentStatus(appointment.id, next);
    setIsBusy(false);

    if (!result.ok) {
      toast.error(t("popover.statusError"), { description: result.error });
      return;
    }

    toast.success(t(`status.${next}`), {
      description: result.data.timelineAdded
        ? t("popover.timelineAdded")
        : undefined,
    });
    close();
    router.refresh();
  }

  async function remove() {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    setIsBusy(true);
    const result = await deleteAppointment(appointment.id);
    setIsBusy(false);

    if (!result.ok) {
      toast.error(t("popover.deleteError"), { description: result.error });
      return;
    }

    toast.success(t("popover.deleted"));
    close();
    router.refresh();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <PopoverAnchor asChild>{children}</PopoverAnchor>

      <PopoverContent align="center" className="w-80 p-0">
        {/* --- Başlık --- */}
        <div className="flex items-start gap-2.5 border-b border-hairline p-4">
          <span
            className={cn("mt-1 size-2.5 shrink-0 rounded-full", palette.accent)}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-snug text-foreground">
              {appointment.title}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {t(`type.${appointment.appointment_type}`)}
            </p>
          </div>
          <Badge
            variant={APPOINTMENT_STATUS_TONES[appointment.status]}
            className="shrink-0"
          >
            {t(`status.${appointment.status}`)}
          </Badge>
        </div>

        {/* --- Ayrıntılar --- */}
        <div className="space-y-2.5 p-4">
          <p className="text-[13px] font-medium tabular-nums text-foreground">
            {formatDayLong(format, toDateKey(appointment.start_time))}
            <span className="mx-1.5 text-muted-foreground">·</span>
            {formatTimeRange(appointment.start_time, appointment.end_time)}
          </p>

          {appointment.customer && (
            <DetailRow icon={<User className="size-3.5" />}>
              <Link
                href={`/musteriler/${appointment.customer.id}`}
                className="transition-colors hover:text-brand"
              >
                {appointment.customer.full_name}
              </Link>
            </DetailRow>
          )}

          {appointment.listing && (
            <DetailRow icon={<Building2 className="size-3.5" />}>
              <Link
                href={`/ilanlar/${appointment.listing.id}`}
                className="transition-colors hover:text-brand"
              >
                {appointment.listing.title}
              </Link>
            </DetailRow>
          )}

          {appointment.location && (
            <DetailRow icon={<MapPin className="size-3.5" />}>
              {appointment.location}
            </DetailRow>
          )}

          {appointment.notes && (
            <p className="rounded-lg bg-surface-inset px-3 py-2 text-[12.5px] leading-relaxed text-secondary-foreground">
              {appointment.notes}
            </p>
          )}
        </div>

        {/* --- Aksiyonlar --- */}
        <div className="flex flex-wrap gap-1.5 border-t border-hairline p-3">
          <PanelAction
            icon={<Pencil className="size-3.5" />}
            onClick={() => {
              close();
              onEdit(appointment);
            }}
            disabled={isBusy}
          >
            {tCommon("edit")}
          </PanelAction>

          {appointment.status === "planlandi" ? (
            <>
              <PanelAction
                icon={<Check className="size-3.5" />}
                onClick={() => changeStatus("tamamlandi")}
                disabled={isBusy}
                tone="success"
              >
                {t("popover.complete")}
              </PanelAction>
              <PanelAction
                icon={<X className="size-3.5" />}
                onClick={() => changeStatus("iptal")}
                disabled={isBusy}
              >
                {t("popover.cancel")}
              </PanelAction>
            </>
          ) : (
            <PanelAction
              icon={<RotateCcw className="size-3.5" />}
              onClick={() => changeStatus("planlandi")}
              disabled={isBusy}
            >
              {t("popover.replan")}
            </PanelAction>
          )}

          <PanelAction
            icon={
              isBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )
            }
            onClick={remove}
            disabled={isBusy}
            tone="danger"
          >
            {isConfirmingDelete ? t("popover.confirmDelete") : tCommon("delete")}
          </PanelAction>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */

function DetailRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex min-w-0 items-center gap-2 text-[12.5px] text-secondary-foreground">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{children}</span>
    </p>
  );
}

function PanelAction({
  icon,
  children,
  onClick,
  disabled,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        tone === "success" &&
          "text-success hover:border-success/40 hover:bg-success-soft",
        tone === "danger" &&
          "text-danger hover:border-danger/40 hover:bg-danger-soft",
        tone === "neutral" &&
          "text-secondary-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
