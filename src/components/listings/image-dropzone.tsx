"use client";

import * as React from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { uploadImage, UploadError } from "@/lib/storage/upload";
import { ACCEPT_ATTRIBUTE, formatBytes, MAX_UPLOAD_BYTES } from "@/lib/storage/paths";

/**
 * İlan galerisi.
 *
 * FAZ 7'DE DEĞİŞEN: Faz 2'den beri burada şu not duruyordu — *"Yükleme henüz
 * sunucuya gitmiyor: seçilen dosyalar `URL.createObjectURL` ile yerel
 * önizlemeye dönüşür."* O geçici çözüm sessiz bir hataya dönüşmüştü, çünkü
 * blob adresi forma bağlanıp veritabanına yazılıyordu ve sekme kapanınca
 * ölüyordu. Artık dosyalar gerçekten Supabase Storage'a gidiyor; forma bağlanan
 * değer kalıcı public URL.
 *
 * Yükleme sırasında her dosya için ayrı bir yer tutucu kart çiziliyor: birden
 * çok fotoğraf seçildiğinde hangisinin ne kadar ilerlediği görünür kalsın.
 */

type Pending = {
  /** İlerleme kartını listedeki yerinde tutar. */
  id: string;
  name: string;
  /** Yerel önizleme — yükleme biterken serbest bırakılır. */
  preview: string;
  ratio: number;
};

export function ImageDropzone({
  value,
  onChange,
  invalid,
}: {
  value: string[];
  onChange: (images: string[]) => void;
  invalid?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [pending, setPending] = React.useState<Pending[]>([]);

  /* `onChange` ve `value` her render'da yeniden üretiliyor (react-hook-form).
     Yükleme uzun sürüyor ve bitişte GÜNCEL listeye eklemek gerekiyor — aksi
     halde eşzamanlı iki yükleme birbirinin sonucunu ezerdi. */
  const latest = React.useRef({ value, onChange });
  latest.current = { value, onChange };

  const addFiles = React.useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selected = Array.from(files);

    await Promise.all(
      selected.map(async (file) => {
        const id = crypto.randomUUID();
        const preview = URL.createObjectURL(file);

        setPending((current) => [
          ...current,
          { id, name: file.name, preview, ratio: 0 },
        ]);

        try {
          const url = await uploadImage(file, "listings", (ratio) => {
            setPending((current) =>
              current.map((item) => (item.id === id ? { ...item, ratio } : item)),
            );
          });

          const { value: currentValue, onChange: apply } = latest.current;
          apply([...currentValue, url]);
        } catch (error) {
          toast.error("Fotoğraf yüklenemedi", {
            description:
              error instanceof UploadError
                ? error.message
                : `"${file.name}" yüklenirken beklenmeyen bir hata oluştu.`,
          });
        } finally {
          URL.revokeObjectURL(preview);
          setPending((current) => current.filter((item) => item.id !== id));
        }
      }),
    );
  }, []);

  function removeAt(index: number) {
    /* Dosya Storage'dan BURADA silinmiyor: kullanıcı formu kaydetmeden
       vazgeçebilir ve o durumda görselin durması gerekir. Kaydedildiğinde
       server action artık kullanılmayanları temizliyor
       (`lib/storage/cleanup.ts`). */
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  }

  /** Kapak görselini başa taşır. */
  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...value];
    const [image] = next.splice(index, 1);
    next.unshift(image);
    onChange(next);
  }

  const isUploading = pending.length > 0;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center",
          "transition-colors duration-200 ease-[var(--ease-out-quint)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDragging
            ? "border-brand bg-brand-soft"
            : "border-hairline-strong bg-surface-inset hover:border-brand/60 hover:bg-surface-hover",
          invalid && !isDragging && "border-danger/60",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl border border-hairline bg-surface-hover">
          <ImagePlus className="size-5 text-brand" strokeWidth={1.7} />
        </span>
        <p className="text-[13.5px] font-medium text-foreground">
          Fotoğrafları buraya sürükleyin
        </p>
        <p className="text-[12.5px] text-muted-foreground">
          veya seçmek için tıklayın · JPG, PNG, WebP · en fazla{" "}
          {formatBytes(MAX_UPLOAD_BYTES)}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          className="hidden"
          onChange={(event) => {
            void addFiles(event.target.files);
            // Aynı dosya tekrar seçilebilsin diye input'u sıfırlıyoruz.
            event.target.value = "";
          }}
        />
      </div>

      {(value.length > 0 || isUploading) && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {value.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-hairline bg-surface-inset"
              >
                {/* Yüklenen görseller Storage'da; `next/image` yerine düz
                    <img> kullanılıyor çünkü bu bir form önizlemesi ve
                    optimizasyon turu gereksiz bir gecikme ekler. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={`Görsel ${index + 1}`}
                  className="size-full object-cover"
                />

                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-md bg-brand px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                    Kapak
                  </span>
                )}

                <div className="absolute inset-x-2 bottom-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(index)}
                      aria-label="Kapak yap"
                      title="Kapak yap"
                      className="rounded-md bg-[#05070C]/75 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-[#05070C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Star className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    aria-label="Görseli kaldır"
                    title="Kaldır"
                    className="rounded-md bg-[#05070C]/75 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {pending.map((item) => (
              <div
                key={item.id}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-hairline bg-surface-inset"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt=""
                  className="size-full object-cover opacity-30"
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-canvas/50 px-3 backdrop-blur-[1px]">
                  <Loader2 className="size-4 animate-spin text-brand" />
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(item.ratio * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.name} yükleniyor`}
                    className="h-1 w-full overflow-hidden rounded-full bg-surface-active"
                  >
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-150 ease-out"
                      style={{ width: `${Math.max(4, item.ratio * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-secondary-foreground">
                    %{Math.round(item.ratio * 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-muted-foreground">
            İlk görsel kapak olarak kullanılır. Sıralamayı değiştirmek için bir
            görselin üzerine gelip yıldız simgesine tıklayın.
          </p>
        </>
      )}
    </div>
  );
}
