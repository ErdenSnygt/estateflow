import Link from "next/link";
import { UserRoundX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function AgentNotFound() {
  return (
    <EmptyState
      icon={UserRoundX}
      badge="Bulunamadı"
      title="Bu personel kayıtlı değil"
      description="Aradığınız kayıt silinmiş veya bağlantı hatalı olabilir. Personel listesinden devam edebilirsiniz."
      action={
        <Button asChild>
          <Link href="/personeller">Personellere dön</Link>
        </Button>
      }
      className="min-h-[460px]"
    />
  );
}
