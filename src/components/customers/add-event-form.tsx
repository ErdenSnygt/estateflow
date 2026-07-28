"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import type { CustomerEventType } from "@/types/database";
import { CUSTOMER_EVENT_LABELS } from "@/lib/customers";
import { createCustomerEvent } from "@/lib/actions/timeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Görüşme geçmişine yeni kayıt ekleme.
 *
 * Kapalı başlıyor ve bir düğmeyle açılıyor: çizelgenin kendisi sayfanın asıl
 * içeriği, sürekli açık duran bir form onu aşağı iterdi.
 *
 * `react-hook-form` + zod KULLANILMADI ve bu bilinçli bir istisna: iki alan
 * var, biri sabit seçenekli, diğerinin tek kuralı boş olmaması. Şema katmanı
 * kurmak burada doğrulamadan çok dosya üretirdi. İlan/müşteri formları gibi
 * onlarca alanlı yerlerde kural aynen geçerli.
 *
 * "created" seçeneği listede yok: kayıt oluşturma olayını uygulama üretir,
 * kullanıcı elle ekleyemez.
 */
const SELECTABLE = (
  Object.keys(CUSTOMER_EVENT_LABELS) as CustomerEventType[]
).filter((type) => type !== "created");

export function AddEventForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [type, setType] = React.useState<CustomerEventType>("called");
  const [note, setNote] = React.useState("");

  function reset() {
    setIsOpen(false);
    setType("called");
    setNote("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = note.trim();
    if (trimmed.length === 0) {
      toast.error("Not boş bırakılamaz", {
        description: "Görüşmede ne konuşulduğunu kısaca yazın.",
      });
      return;
    }

    setIsSaving(true);
    const result = await createCustomerEvent({ customerId, type, note: trimmed });
    setIsSaving(false);

    if (!result.ok) {
      toast.error("Kayıt eklenemedi", { description: result.error });
      return;
    }

    toast.success("Görüşme kaydedildi", {
      description: CUSTOMER_EVENT_LABELS[type],
    });
    reset();
    router.refresh();
  }

  if (!isOpen) {
    return (
      <div className="px-5 pb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="size-3.5" />
          Görüşme kaydı ekle
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-5 mb-4 space-y-3 rounded-xl border border-hairline bg-surface-inset p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[13.5px] font-semibold text-foreground">
          Yeni görüşme kaydı
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          aria-label="Vazgeç"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-type">Olay türü</Label>
        <Select
          value={type}
          onValueChange={(value) => setType(value as CustomerEventType)}
        >
          <SelectTrigger id="event-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SELECTABLE.map((value) => (
              <SelectItem key={value} value={value}>
                {CUSTOMER_EVENT_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-note">Not</Label>
        <Textarea
          id="event-note"
          rows={3}
          maxLength={500}
          value={note}
          onChange={(changed) => setNote(changed.target.value)}
          placeholder="Örn. Kadıköy'deki 3+1 için ikinci kez görüşüldü, fiyatta 500 B indirim bekliyor."
        />
        <p className="text-[12px] text-muted-foreground">
          {note.length} / 500 karakter
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          Vazgeç
        </Button>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Kaydediliyor…
            </>
          ) : (
            "Kaydet"
          )}
        </Button>
      </div>
    </form>
  );
}
