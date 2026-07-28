"use client";

import * as React from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { uploadImage, UploadError } from "@/lib/storage/upload";
import { ACCEPT_ATTRIBUTE, formatBytes, MAX_UPLOAD_BYTES } from "@/lib/storage/paths";
import { Button } from "@/components/ui/button";

/**
 * Tek görsellik portre yükleme alanı.
 *
 * Müşteri formu ve personel detayı aynı bileşeni kullanıyor; ikisinde de veri
 * tek bir `avatar_url` kolonu ve davranış birebir aynı. İlan galerisi
 * (`ImageDropzone`) ayrı kaldı çünkü orada çoklu dosya, sıralama ve "kapak"
 * kavramı var — ortaklaştırmak iki farklı işi tek bileşene sıkıştırmak olurdu.
 * Paylaşılan asıl mantık zaten `lib/storage/upload.ts` içinde.
 *
 * Değer sözleşmesi: boş metin "fotoğraf yok" demek (`customers-schema.ts`
 * ile aynı kural). Çağıran taraf null'a çevirmekten sorumlu.
 */
export function AvatarUpload({
  value,
  onChange,
  name,
  initials,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Erişilebilirlik metni ve baş harf yedeği için. */
  name: string;
  initials?: string;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [ratio, setRatio] = React.useState<number | null>(null);

  const isUploading = ratio !== null;

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setRatio(0);
    try {
      const url = await uploadImage(file, "avatars", setRatio);
      onChange(url);
    } catch (error) {
      toast.error("Fotoğraf yüklenemedi", {
        description:
          error instanceof UploadError
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      });
    } finally {
      setRatio(null);
    }
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-hairline bg-gradient-to-br from-brand to-violet">
        {value ? (
          /* Form önizlemesi — `next/image` optimizasyon turu burada
             gereksiz gecikme ekler. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={value} alt={name} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[17px] font-semibold text-white">
            {initials ?? "?"}
          </span>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-canvas/65">
            <Loader2 className="size-4 animate-spin text-brand" />
            <span
              role="progressbar"
              aria-valuenow={Math.round(ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${name} fotoğrafı yükleniyor`}
              className="text-[10.5px] font-medium tabular-nums text-white"
            >
              %{Math.round(ratio * 100)}
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            {value ? "Değiştir" : "Fotoğraf yükle"}
          </Button>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => onChange("")}
            >
              <Trash2 className="size-3.5" />
              Kaldır
            </Button>
          )}
        </div>

        <p className="text-[12px] text-muted-foreground">
          JPG, PNG veya WebP · en fazla {formatBytes(MAX_UPLOAD_BYTES)}. Boş
          bırakılırsa baş harfler gösterilir.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
