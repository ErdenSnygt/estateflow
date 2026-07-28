"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * ============================================================================
 * FİLTRE SATIRI — masaüstünde satır, mobilde çekmece
 * ============================================================================
 * İlanlar filtre çubuğunda yedi kontrol var (kategori, durum, şehir, ilçe,
 * oda, fiyat aralığı, alan aralığı). 375 px'de bunlar alt alta sarılıp
 * ekranın yarısını yiyordu; kullanıcı listeye ulaşmak için kaydırmak zorunda
 * kalıyordu.
 *
 * Mobilde hepsi bir çekmeceye giriyor ve geriye tek bir "Filtrele" düğmesi
 * kalıyor — etkin filtre sayısı rozet olarak üstünde.
 *
 * TEK RENDER: çocuklar hem satırda hem çekmecede çizilseydi aynı `id`'ler
 * belgede iki kez bulunur, `<label for>` bağları bozulurdu. Bu yüzden medya
 * sorgusu CSS'te değil JavaScript'te — hangi kabuğun çizileceğine React karar
 * veriyor.
 */
export function FilterRow({
  activeCount,
  onClear,
  children,
  className,
}: {
  activeCount: number;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isMobile = useMediaQuery("(max-width: 767.98px)");
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isMobile) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {children}
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5">
            <X className="size-3.5" />
            Temizle
            <Badge variant="brand" className="ml-0.5">
              {activeCount}
            </Badge>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1 justify-center"
          onClick={() => setIsOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          Filtrele
          {activeCount > 0 && (
            <Badge variant="brand" className="ml-1">
              {activeCount}
            </Badge>
          )}
        </Button>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="size-3.5" />
            Temizle
          </Button>
        )}
      </div>

      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <div className="min-w-0">
            <SheetTitle>Filtreler</SheetTitle>
            <SheetDescription>
              {activeCount > 0
                ? `${activeCount} filtre etkin`
                : "Sonuçları daraltmak için seçim yapın"}
            </SheetDescription>
          </div>
          <SheetCloseButton />
        </SheetHeader>

        <SheetBody>
          {/* Kontroller çekmecede tam genişlik: masaüstündeki sabit
              genişlikler (`w-[186px]` gibi) burada dar kalırdı. Seçici
              `data-slot` üzerinden — her kontrolü tek tek sarmalamak
              gerekmesin. */}
          <div
            className={cn(
              "grid gap-2.5",
              "[&_[data-slot=select-trigger]]:w-full",
              "[&>*]:w-full",
            )}
          >
            {children}
          </div>

          <SheetClose asChild>
            <Button className="mt-4 w-full">Sonuçları göster</Button>
          </SheetClose>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
