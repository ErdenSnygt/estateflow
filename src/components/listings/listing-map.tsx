import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Harita yer tutucusu. Gerçek harita yerleştirmesi ayrı bir fazda gelecek;
 * o zaman bu bileşenin gövdesi değişecek, kullanan sayfa aynı kalacak.
 *
 * Koordinatlar null olabilir: formda harita seçici yok, yani elle eklenen
 * ilanların konumu boş. İşaretçi yine gösteriliyor (adres biliniyor), yalnızca
 * koordinat satırı yerini "konum girilmemiş" bilgisine bırakıyor.
 */
export function ListingMap({
  latitude,
  longitude,
  label,
  className,
}: {
  latitude: number | null;
  longitude: number | null;
  label: string;
  className?: string;
}) {
  const hasCoordinates = latitude !== null && longitude !== null;

  return (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-xl border border-hairline bg-surface-inset",
        className,
      )}
    >
      {/* Şematik sokak ızgarası */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.07) 2px, transparent 2px)",
          backgroundSize: "112px 112px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(76,125,255,0.14),transparent_62%)]"
      />

      {/* Konum işareti */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          aria-hidden
          className="absolute inset-0 -m-4 animate-ping rounded-full bg-brand/25"
        />
        <span className="relative flex size-9 items-center justify-center rounded-full border border-brand/50 bg-brand shadow-glow">
          <MapPin className="size-4.5 text-white" strokeWidth={2.2} />
        </span>
      </div>

      <div className="absolute inset-x-3 bottom-3 rounded-lg border border-hairline bg-surface/80 px-3 py-2 backdrop-blur-sm">
        <p className="truncate text-[12.5px] font-medium text-foreground">
          {label}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {hasCoordinates
            ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : "Koordinat girilmemiş"}
        </p>
      </div>
    </div>
  );
}
