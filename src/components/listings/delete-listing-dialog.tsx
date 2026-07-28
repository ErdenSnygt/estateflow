"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
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
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleDelete(event: React.MouseEvent) {
    // Dialog'un hemen kapanmasını engelle; bekleme durumunu gösterelim.
    event.preventDefault();
    setIsDeleting(true);

    const result = await deleteListing(listingId);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error("İlan silinemedi", { description: result.error });
      return;
    }

    setOpen(false);
    toast.success("İlan silindi", {
      description: `${listingTitle} portföyden kaldırıldı.`,
    });

    router.push("/ilanlar");
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" className="text-danger hover:text-danger">
          <Trash2 className="size-4" />
          Sil
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>İlanı silmek istiyor musunuz?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{listingTitle}</span>{" "}
            ({listingId.toUpperCase()}) portföyünüzden kaldırılacak. Bu işlem
            geri alınamaz ve ilan yayında olduğu portallardan da düşer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Siliniyor…
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Evet, sil
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
