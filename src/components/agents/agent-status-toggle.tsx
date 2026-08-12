"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("agents.status");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  async function apply() {
    setIsSaving(true);
    const result = await setAgentActive(agentId, !isActive);
    setIsSaving(false);
    setIsOpen(false);

    if (!result.ok) {
      toast.error(t("error"), { description: result.error });
      return;
    }

    toast.success(t(isActive ? "deactivated" : "activated"), {
      description: agentName,
    });
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
            {t("deactivate")}
          </>
        ) : (
          <>
            <UserRoundCheck className="size-4" />
            {t("activate")}
          </>
        )}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(isActive ? "confirmDeactivate" : "confirmActivate", {
                name: agentName,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {isActive ? (
                  <>
                    <p>{t("deactivateBody")}</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>{t("keepsRecords")}</li>
                      <li>{t("keepsHistory")}</li>
                      <li>{t("showsBadge")}</li>
                    </ul>
                    <p className="text-muted-foreground">{t("reversible")}</p>
                  </>
                ) : (
                  <p>{t("activateBody")}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              {tCommon("cancel")}
            </AlertDialogCancel>
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
                  {t("processing")}
                </>
              ) : (
                t(
                  isActive
                    ? "confirmDeactivateAction"
                    : "confirmActivateAction",
                )
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
