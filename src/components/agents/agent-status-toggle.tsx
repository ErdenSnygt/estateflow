"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRoundCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";

import { setAgentActive } from "@/lib/auth/admin-actions";
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
 * Pasifleştirme / yeniden etkinleştirme.
 *
 * SİLME DÜĞMESİ YOK ve olmayacak: bir danışmanın ilanları, müşterileri ve
 * kapanan satışları ona bağlı. Şema silmeyi zaten reddediyor
 * (`on delete restrict`) ve bu doğru — ayrılan bir danışmanın geçmiş cirosu
 * ofisin geçmişidir.
 */
export function AgentStatusToggle({
  agentId,
  agentName,
  isActive,
}: {
  agentId: string;
  agentName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  async function apply() {
    setIsSaving(true);
    const result = await setAgentActive(agentId, !isActive);
    setIsSaving(false);
    setIsOpen(false);

    if (!result.ok) {
      toast.error("İşlem tamamlanamadı", { description: result.error });
      return;
    }

    toast.success(
      isActive ? "Personel pasifleştirildi" : "Personel yeniden etkinleştirildi",
      { description: agentName },
    );
    router.refresh();
  }

  return (
    <>
      <Button
        variant={isActive ? "ghost" : "secondary"}
        onClick={() => setIsOpen(true)}
      >
        {isActive ? (
          <>
            <UserRoundX className="size-4" />
            Pasifleştir
          </>
        ) : (
          <>
            <UserRoundCheck className="size-4" />
            Yeniden etkinleştir
          </>
        )}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive
                ? `${agentName} pasifleştirilsin mi?`
                : `${agentName} yeniden etkinleştirilsin mi?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {isActive ? (
                  <>
                    <p>Bu personel giriş yapabilir ama hiçbir veriye erişemez.</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>İlanları, müşterileri ve satışları silinmez</li>
                      <li>Prim ve performans geçmişi korunur</li>
                      <li>Listelerde &quot;pasif&quot; rozetiyle görünür</li>
                    </ul>
                    <p className="text-muted-foreground">
                      İstediğiniz zaman geri alabilirsiniz.
                    </p>
                  </>
                ) : (
                  <p>
                    Erişimi geri açılacak; rolü ve prim oranı eskisi gibi
                    kalacak.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void apply();
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  İşleniyor…
                </>
              ) : isActive ? (
                "Pasifleştir"
              ) : (
                "Etkinleştir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
