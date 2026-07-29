"use client";

import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { UploadError, uploadImage } from "@/lib/storage/upload";
import { ACCEPT_ATTRIBUTE } from "@/lib/storage/paths";
import { Button } from "@/components/ui/button";

/**
 * Geniş kapak görseli yükleme.
 *
 * `AvatarUpload` ile AYNI ALTYAPI (`uploadImage`, `avatars` bucket'ı) ama ayrı
 * bir bileşen: portre kare ve 64px, kapak 3:1 bir şerit ve sayfanın tamamı
 * kadar geniş. İkisini tek bileşene sıkıştırmak, en/boy ve önizleme
 * boyutlarını prop olarak dışarı çıkarmak demekti — üç satır kazanmak için
 * iki farklı işi tek yere bağlamak.
 *
 * Bucket paylaşımı bilinçli: kapak da portre kadar herkese açık bir görsel,
 * ayrı bir bucket aynı korumaya sahip ikinci bir yer yaratırdı.
 */
export function CoverUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
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
      toast.error("Kapak yüklenemedi", {
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
    <div className="space-y-2">
      <div
        className={cn(
          "relative aspect-[4/1] w-full overflow-hidden rounded-xl border border-hairline",
          value
            ? "bg-surface-inset"
            : "bg-gradient-to-br from-brand/25 via-violet/20 to-surface-inset",
        )}
      >
        {value && (
          /* Form önizlemesi — `next/image` optimizasyon turu burada gereksiz
             gecikme ekler (`AvatarUpload` ile aynı gerekçe). */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={value}
            alt="Kapak önizlemesi"
            className="size-full object-cover"
          />
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-canvas/70 text-[12.5px] text-foreground">
            <Loader2 className="size-4 animate-spin" />%{Math.round(ratio * 100)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <ImagePlus className="size-4" />
          {value ? "Değiştir" : "Kapak seç"}
        </Button>

        {value && !isUploading && (
          <Button type="button" variant="ghost" onClick={() => onChange("")}>
            <Trash2 className="size-4" />
            Kaldır
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => handleFile(event.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}
