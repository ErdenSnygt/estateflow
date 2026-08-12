"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import type { OfferStatus } from "@/types/database";
import { availableTransitions } from "@/lib/offers";
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
  const t = useTranslations("offers");
  const tCommon = useTranslations("common");
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
      toast.error(t("actions.error"), { description: result.error });
      return;
    }

    toast.success(
      result.data.saleCreated
        ? t("actions.saleClosed")
        : t("actions.marked", { status: t(`status.${next}`) }),
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
            {t("actions.accept")}
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
            {t(next === "rejected" ? "actions.reject" : "actions.expire")}
          </Button>
        ),
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {/* İlan adı cümlenin İÇİNDE: Türkçede başta, İngilizcede
                    sonda ("The offer of X on Y"). Kalın yazım metnin
                    içinde `<b>` olarak, `t.rich` onu elemana çeviriyor. */}
                <p>
                  {t.rich("actions.confirmIntro", {
                    title: listingTitle,
                    amount: formatCurrency(amount),
                    b: (chunks) => (
                      <span className="font-medium text-foreground">
                        {chunks}
                      </span>
                    ),
                  })}
                </p>
                <p>{t("actions.confirmLead")}</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>{t("actions.confirmSale")}</li>
                  <li>{t("actions.confirmListing")}</li>
                  <li>{t("actions.confirmOthers")}</li>
                  <li>{t("actions.confirmTimeline")}</li>
                </ul>
                <p className="font-medium text-warning">
                  {t("actions.confirmWarning")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>
              {tCommon("cancel")}
            </AlertDialogCancel>
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
                  {t("actions.processing")}
                </>
              ) : (
                t("actions.confirmSubmit")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
