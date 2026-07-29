"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { openConversation } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";

/**
 * Müşteri detayındaki "Mesaj gönder".
 *
 * DOĞRUDAN LİNK DEĞİL çünkü konuşma henüz var olmayabilir: yazışma ilk
 * mesajda değil, bu düğmeyle doğuyor. Action konuşmayı bulur ya da açar,
 * sonra mesaj merkezine o konuşma seçili olarak gidiliyor.
 *
 * Boş konuşma kaydı üretmenin bedeli küçük (bir satır) ve karşılığında
 * kullanıcı doğrudan yazma alanına düşüyor — alternatifi, "önce bir mesaj
 * yaz, sonra konuşmayı açalım" gibi görünmeyen bir sıraydı.
 */
export function MessageCustomerButton({
  customerId,
  variant = "secondary",
}: {
  customerId: string;
  variant?: "secondary" | "outline";
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = React.useState(false);

  async function handleClick() {
    setIsBusy(true);
    const result = await openConversation(customerId);
    setIsBusy(false);

    if (!result.ok) {
      toast.error("Yazışma açılamadı", { description: result.error });
      return;
    }

    router.push(`/mesajlar?k=${result.data.id}`);
  }

  return (
    <Button variant={variant} onClick={handleClick} disabled={isBusy}>
      {isBusy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <MessageSquare className="size-4" />
      )}
      Mesaj gönder
    </Button>
  );
}
