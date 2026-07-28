import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function ListingNotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      badge="Bulunamadı"
      title="Bu ilan portföyde yok"
      description="Aradığınız ilan silinmiş, arşivlenmiş veya bağlantı hatalı olabilir. Portföy listesinden arama yaparak devam edebilirsiniz."
      action={
        <Button asChild>
          <Link href="/ilanlar">İlanlara dön</Link>
        </Button>
      }
      className="min-h-[460px]"
    />
  );
}
