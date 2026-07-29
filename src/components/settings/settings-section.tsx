import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Ayarlar sayfasındaki bölüm kabuğu.
 *
 * Sayfa yedi bölümden oluşuyor ve hepsi aynı iskeleti paylaşıyor: ikon,
 * başlık, açıklama, gövde. Ortak bir bileşen olmasaydı yedi kez tekrar eder
 * ve biri diğerinden saparak sayfayı dağıtırdı.
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  badge,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** "Yakında" gibi durum işareti. */
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-secondary-foreground">
            <Icon className="size-[18px]" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold text-foreground">
                {title}
              </h2>
              {badge && <Badge variant="outline">{badge}</Badge>}
            </div>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className={cn("border-t border-hairline pt-5")}>{children}</div>
      </CardContent>
    </Card>
  );
}

/**
 * Henüz çalışmayan bölümlerin gövdesi.
 *
 * BOŞ BİR KUTU YERİNE AÇIK BİR CÜMLE: "yakında" yazan bir alan, kullanıcının
 * bir şeyi kaçırıp kaçırmadığını merak etmesine yol açıyor. Neyin neden
 * olmadığı yazılınca soru kalmıyor.
 */
export function SettingsPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-hairline-strong bg-surface-inset px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
