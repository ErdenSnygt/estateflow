import Link from "next/link";
import { UserRoundX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function CustomerNotFound() {
  return (
    <EmptyState
      icon={UserRoundX}
      badge="Bulunamadı"
      title="Bu müşteri kayıtlı değil"
      description="Aradığınız kayıt silinmiş veya bağlantı hatalı olabilir. Müşteri listesinden arama yaparak devam edebilirsiniz."
      action={
        <Button asChild>
          <Link href="/musteriler">Müşterilere dön</Link>
        </Button>
      }
      className="min-h-[460px]"
    />
  );
}
