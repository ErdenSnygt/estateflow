"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { deleteListing } from "@/lib/actions/listings";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Silme akışı. Faz 5'te gerçek: `handleDelete` bir server action çağırıyor,
 * kayıt Supabase'den kalkıyor. Onay adımı, bekleme durumu ve bildirim zinciri
 * Faz 2'den beri aynı.
 */
export function DeleteListingDialog({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const router = useRouter();
  const t = useTranslations("listings.delete");
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleDelete(event: React.MouseEvent) {
    // Dialog'un hemen kapanmasını engelle; bekleme durumunu gösterelim.
    event.preventDefault();
    setIsDeleting(true);

    const result = await deleteListing(listingId);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(t("errorTitle"), { description: result.error });
      return;
    }

    setOpen(false);
    toast.success(t("successTitle"), {
      description: t("successDescription", { title: listingTitle }),
    });

    router.push("/ilanlar");
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" className="text-danger hover:text-danger">
          <Trash2 className="size-4" />
          {t("trigger")}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {/* Cümle parçalanmıyor: ilan adı Türkçe'de başta, İngilizce'de de
                başta ama noktalama ve devamı dile göre değişiyor. Kalın yazım
                metnin İÇİNDE `<b>` olarak duruyor, `t.rich` onu React
                elemanına çeviriyor. */}
            {t.rich("description", {
              title: listingTitle,
              id: listingId.toUpperCase(),
              b: (chunks) => (
                <span className="font-medium text-foreground">{chunks}</span>
              ),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                {t("confirm")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
