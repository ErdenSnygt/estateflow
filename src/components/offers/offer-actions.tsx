"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import type { OfferStatus } from "@/types/database";
import { availableTransitions, OFFER_STATUS_LABELS } from "@/lib/offers";
import { updateOfferStatus } from "@/lib/actions/offers";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Bir teklif satırının aksiyon düğmeleri.
 *
 * Hangi düğmelerin görüneceği `availableTransitions()`ten geliyor — yani
 * arayüz ile sunucu AYNI kural tablosuna bakıyor (`lib/offers.ts`). Terminal
 * durumdaki bir teklifte hiç düğme çıkmaz.
 *
 * Kabul ayrı bir onay ekranı ister: tek tıkla ilan "satıldı"ya geçiyor, satış
 * satırı yazılıyor ve aynı ilandaki diğer bekleyen teklifler kapanıyor. Geri
 * alınamayan bir işlem için onay istemek gerekiyor. Reddetme ve süre dolumu
 * yalnızca durum güncellemesi, onay istemiyorlar.
 */
const ICONS: Partial<Record<OfferStatus, React.ReactNode>> = {
  accepted: <Check className="size-3.5" />,
  rejected: <X className="size-3.5" />,
  expired: <Clock className="size-3.5" />,
};

export function OfferActions({
  offerId,
  status,
  amount,
  listingTitle,
}: {
  offerId: string;
  status: OfferStatus;
  amount: number;
  listingTitle: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<OfferStatus | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  const transitions = availableTransitions(status);
  if (transitions.length === 0) return null;

  async function apply(next: OfferStatus) {
    setPending(next);
    const result = await updateOfferStatus(offerId, next);
    setPending(null);
    setConfirming(false);

    if (!result.ok) {
      toast.error("Teklif güncellenemedi", { description: result.error });
      return;
    }

    toast.success(
      result.data.saleCreated
        ? "Satış kapandı"
        : `Teklif "${OFFER_STATUS_LABELS[next].toLocaleLowerCase("tr-TR")}" olarak işaretlendi`,
      {
        description: result.data.saleCreated
          ? `${listingTitle} · ${formatCurrency(amount)}`
          : listingTitle,
      },
    );
    router.refresh();
  }

  const isBusy = pending !== null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {transitions.map((next) =>
        next === "accepted" ? (
          <Button
            key={next}
            size="sm"
            disabled={isBusy}
            onClick={() => setConfirming(true)}
          >
            {pending === next ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              ICONS[next]
            )}
            Kabul et
          </Button>
        ) : (
          <Button
            key={next}
            size="sm"
            variant="ghost"
            disabled={isBusy}
            onClick={() => void apply(next)}
          >
            {pending === next ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              ICONS[next]
            )}
            {next === "rejected" ? "Reddet" : "Süresi doldu"}
          </Button>
        ),
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teklifi kabul et</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <span className="font-medium text-foreground">
                    {listingTitle}
                  </span>{" "}
                  için {formatCurrency(amount)} tutarındaki teklif kabul
                  edilecek.
                </p>
                <p>Bu işlem tek adımda şunları yapar:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Kapanan satış kaydı oluşturur</li>
                  <li>İlanı &quot;satıldı&quot; durumuna geçirir</li>
                  <li>Aynı ilandaki diğer bekleyen teklifleri kapatır</li>
                  <li>Müşterinin görüşme geçmişine satın alma kaydı düşer</li>
                </ul>
                <p className="font-medium text-warning">
                  Kabul edilen bir teklif geri alınamaz.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void apply("accepted");
              }}
              disabled={isBusy}
            >
              {isBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  İşleniyor…
                </>
              ) : (
                "Kabul et ve satışı kapat"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
