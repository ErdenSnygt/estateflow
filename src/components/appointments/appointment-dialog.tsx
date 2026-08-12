"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { AppointmentType } from "@/types/database";
import type { AppointmentItem, CustomerOption } from "@/lib/data/appointments";
import type { AgentOption } from "@/lib/data/agents";
import { APPOINTMENT_TYPES } from "@/lib/appointments";
import {
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointments";
import {
  DEFAULT_DURATION_MINUTES,
  MINUTES_PER_DAY,
  formatMinutes,
  minutesOfDay,
  toDateKey,
  toIso,
  type DateKey,
} from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Randevu formu — YENİ VE DÜZENLE AYNI BİLEŞEN.
 *
 * `OfferDialog` ile aynı gerekçe: iki ayrı form iki ayrı doğrulama ve zamanla
 * birbirinden ayrışan iki alan listesi demek. Fark yalnızca başlangıç
 * değerlerinde ve hangi action'ın çağrıldığında.
 *
 * Diyalog DIŞARIDAN AÇILIYOR (`open` + `mode` prop'ları): takvimde boş bir
 * slota tıklamak da, üstteki "Randevu Ekle" düğmesi de, panelin "Düzenle"si de
 * aynı formu açıyor — üçünün de kendi tetikleyicisi olsaydı üç ayrı kopya
 * gerekirdi.
 *
 * SAAT AYRI, TARİH AYRI ALAN. Tek bir `datetime-local` alanı daha az yer
 * kaplardı ama bitiş saatini de ayrıca sormak gerekiyor ve iki tam tarih
 * yan yana geldiğinde "aynı gün mü" sorusu forma giriyor. Randevular gün
 * içinde kalıyor: bir tarih, iki saat.
 */

export type AppointmentDialogMode =
  | { kind: "create"; date: DateKey; minutes: number }
  | { kind: "edit"; appointment: AppointmentItem };

/** `<input type="time">` değeri ("09:30") ↔ dakika. */
function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes <= MINUTES_PER_DAY ? minutes : null;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  mode,
  customerOptions,
  listingOptions,
  agentOptions,
  currentAgentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AppointmentDialogMode | null;
  customerOptions: CustomerOption[];
  listingOptions: CustomerOption[];
  /** Boş dizi = danışman; yalnızca yöneticiye danışman seçtiriliyor. */
  agentOptions: AgentOption[];
  currentAgentId: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const [isSaving, setIsSaving] = React.useState(false);

  const initial = React.useMemo(() => toFormState(mode, currentAgentId), [
    mode,
    currentAgentId,
  ]);
  const [form, setForm] = React.useState(initial);

  /* Diyalog kapalıyken de bileşen ağaçta duruyor (tek örnek, üç tetikleyici);
     mod değiştiğinde alanlar yeni randevuya göre tazeleniyor. */
  React.useEffect(() => setForm(initial), [initial]);

  const isEdit = mode?.kind === "edit";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!mode) return;

    const startMinutes = parseTime(form.startTime);
    const endMinutes = parseTime(form.endTime);

    if (startMinutes === null || endMinutes === null) {
      toast.error(t("dialog.invalidTimeTitle"), {
        description: t("dialog.invalidTimeBody"),
      });
      return;
    }
    if (endMinutes <= startMinutes) {
      toast.error(t("dialog.invalidRangeTitle"), {
        description: t("dialog.invalidRangeBody"),
      });
      return;
    }
    if (!form.customerId) {
      toast.error(t("dialog.missingTitle"), {
        description: t("dialog.missingCustomer"),
      });
      return;
    }

    const startIso = toIso(form.date, startMinutes);
    const endIso = toIso(form.date, endMinutes);

    setIsSaving(true);
    const result = isEdit
      ? await updateAppointment(mode.appointment.id, {
          title: form.title,
          type: form.type,
          customerId: form.customerId,
          listingId: form.listingId || null,
          startIso,
          endIso,
          location: form.location,
          notes: form.notes,
        })
      : await createAppointment({
          title: form.title,
          type: form.type,
          customerId: form.customerId,
          listingId: form.listingId || null,
          agentId: form.agentId || undefined,
          startIso,
          endIso,
          location: form.location,
          notes: form.notes,
        });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(t(isEdit ? "dialog.updateError" : "dialog.createError"), {
        description: result.error,
      });
      return;
    }

    toast.success(t(isEdit ? "dialog.updateSuccess" : "dialog.createSuccess"), {
      description: `${formatMinutes(startMinutes)} – ${formatMinutes(endMinutes)}`,
    });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {t(isEdit ? "dialog.editTitle" : "dialog.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {t(isEdit ? "dialog.editDescription" : "dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* --- Tür --- */}
            <div className="space-y-2">
              <Label htmlFor="appointment-type">{t("dialog.typeLabel")}</Label>
              <Select
                value={form.type}
                onValueChange={(value) => update("type", value as AppointmentType)}
              >
                <SelectTrigger id="appointment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`type.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* --- Başlık ---
                Boş bırakılırsa tür adı başlık oluyor (`appointmentTitle`);
                zorunlu tutmak, kullanıcıyı "Ev gezme" yazmaya zorlamaktı. */}
            <div className="space-y-2">
              <Label htmlFor="appointment-title">{t("dialog.titleLabel")}</Label>
              <Input
                id="appointment-title"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                /* Boş başlığın yerini tür adı alıyor; sunucu da öyle
                   kaydediyor (`appointmentTitle`). Oradaki metin Türkçe ve
                   kalıcı, buradaki ekrana ait — gerekçe `lib/appointments.ts`
                   başlığında. */
                placeholder={t(`type.${form.type}`)}
              />
            </div>

            {/* --- Tarih ve saat --- */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="appointment-date">{t("dialog.dateLabel")}</Label>
                <Input
                  id="appointment-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => update("date", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-start">{t("dialog.startLabel")}</Label>
                <Input
                  id="appointment-start"
                  type="time"
                  step={900}
                  value={form.startTime}
                  onChange={(event) => {
                    const next = event.target.value;
                    /* Başlangıç değişince bitiş SÜREYİ KORUYARAK kayıyor —
                       kullanıcı iki alanı da elle düzeltmek zorunda kalmasın. */
                    const start = parseTime(next);
                    const oldStart = parseTime(form.startTime);
                    const oldEnd = parseTime(form.endTime);
                    setForm((previous) => ({
                      ...previous,
                      startTime: next,
                      endTime:
                        start !== null && oldStart !== null && oldEnd !== null
                          ? formatMinutes(
                              Math.min(
                                start + (oldEnd - oldStart),
                                MINUTES_PER_DAY - 1,
                              ),
                            )
                          : previous.endTime,
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-end">{t("dialog.endLabel")}</Label>
                <Input
                  id="appointment-end"
                  type="time"
                  step={900}
                  value={form.endTime}
                  onChange={(event) => update("endTime", event.target.value)}
                />
              </div>
            </div>

            {/* --- Müşteri --- */}
            <div className="space-y-2">
              <Label htmlFor="appointment-customer">{t("dialog.customerLabel")}</Label>
              {customerOptions.length > 0 ? (
                <Select
                  value={form.customerId}
                  onValueChange={(value) => update("customerId", value)}
                >
                  <SelectTrigger id="appointment-customer">
                    <SelectValue placeholder={t("dialog.customerPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {customerOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                        {option.hint ? ` · ${option.hint}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-lg border border-dashed border-hairline-strong px-3 py-2.5 text-[12.5px] text-muted-foreground">
                  {t("dialog.noCustomers")}
                </p>
              )}
            </div>

            {/* --- İlan (opsiyonel) --- */}
            <div className="space-y-2">
              <Label htmlFor="appointment-listing">
                {t("dialog.listingLabel")}{" "}
                <span className="font-normal text-muted-foreground">
                  {tCommon("optional")}
                </span>
              </Label>
              <Select
                value={form.listingId || NO_LISTING}
                onValueChange={(value) =>
                  update("listingId", value === NO_LISTING ? "" : value)
                }
              >
                <SelectTrigger id="appointment-listing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Radix `SelectItem` boş değere izin vermiyor; "yok"
                      seçeneği için ayrı bir işaret değeri kullanılıyor. */}
                  <SelectItem value={NO_LISTING}>{t("dialog.noListing")}</SelectItem>
                  {listingOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                      {option.hint ? ` · ${option.hint}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* --- Danışman (yalnızca yönetici) ---
                Danışman kendi takvimine yazar; sunucu da öyle davranıyor
                (`resolveAgentId`). Düzenlemede sahiplik hiç değişmiyor. */}
            {!isEdit && agentOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="appointment-agent">{t("dialog.agentLabel")}</Label>
                <Select
                  value={form.agentId}
                  onValueChange={(value) => update("agentId", value)}
                >
                  <SelectTrigger id="appointment-agent">
                    <SelectValue placeholder={t("dialog.agentPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {agentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* --- Konum --- */}
            <div className="space-y-2">
              <Label htmlFor="appointment-location">{t("dialog.locationLabel")}</Label>
              <Input
                id="appointment-location"
                value={form.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder={t("dialog.locationPlaceholder")}
              />
            </div>

            {/* --- Not --- */}
            <div className="space-y-2">
              <Label htmlFor="appointment-notes">{t("dialog.notesLabel")}</Label>
              <Textarea
                id="appointment-notes"
                rows={3}
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder={t("dialog.notesPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || customerOptions.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {tCommon("saving")}
                </>
              ) : (
                t(isEdit ? "dialog.submitEdit" : "dialog.submitCreate")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */

const NO_LISTING = "__none__";

type FormState = {
  title: string;
  type: AppointmentType;
  date: DateKey;
  startTime: string;
  endTime: string;
  customerId: string;
  listingId: string;
  agentId: string;
  location: string;
  notes: string;
};

function toFormState(
  mode: AppointmentDialogMode | null,
  currentAgentId: string | null,
): FormState {
  if (mode?.kind === "edit") {
    const appointment = mode.appointment;
    return {
      title: appointment.title,
      type: appointment.appointment_type,
      date: toDateKey(appointment.start_time),
      startTime: formatMinutes(minutesOfDay(appointment.start_time)),
      endTime: formatMinutes(minutesOfDay(appointment.end_time)),
      customerId: appointment.customer?.id ?? "",
      listingId: appointment.listing?.id ?? "",
      agentId: appointment.agent?.id ?? currentAgentId ?? "",
      location: appointment.location,
      notes: appointment.notes,
    };
  }

  const date = mode?.kind === "create" ? mode.date : toDateKey(Date.now());
  const start = mode?.kind === "create" ? mode.minutes : 9 * 60;

  return {
    title: "",
    type: "ev_gezme",
    date,
    startTime: formatMinutes(start),
    endTime: formatMinutes(
      Math.min(start + DEFAULT_DURATION_MINUTES, MINUTES_PER_DAY - 1),
    ),
    customerId: "",
    listingId: "",
    agentId: currentAgentId ?? "",
    location: "",
    notes: "",
  };
}
