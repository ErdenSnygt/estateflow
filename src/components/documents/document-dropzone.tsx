"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, FileUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import type { DocumentType } from "@/types/database";
import {
  DOCUMENT_TYPE_OPTIONS,
  guessDocumentType,
  titleFromFileName,
} from "@/lib/messaging";
import {
  ACCEPT_DOCUMENT_ATTRIBUTE,
  MAX_DOCUMENT_BYTES,
  formatBytes,
} from "@/lib/storage/paths";
import { UploadError } from "@/lib/storage/upload";
import { uploadDocument } from "@/lib/storage/upload-document";
import { createDocument } from "@/lib/actions/documents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * ============================================================================
 * BELGE YÜKLEME ALANI
 * ============================================================================
 * `listings/image-dropzone.tsx` ile aynı sürükle-bırak deseni ama İKİ FARKI
 * var ve ikisi de belgenin doğasından geliyor:
 *
 *  1. HER DOSYA BİR FORM AÇIYOR. Görsellerde dosya seçilir seçilmez yükleme
 *     başlıyordu; belgede öyle olamaz çünkü tür ("tapu" mu "kimlik" mi) ve
 *     ilişki (hangi müşteri) dosyadan okunamıyor. Kullanıcı önce doğruluyor.
 *
 *  2. BAŞLIK VE TÜR ÖNERİLİYOR. Boş bir form göstermek yerine dosya adından
 *     tahmin ediliyor (`guessDocumentType`); "tapu_kadikoy.pdf" yükleyen biri
 *     çoğu zaman hiçbir alana dokunmadan kaydediyor.
 *
 * Sürükleme sayaç ile izleniyor (`dragDepth`): `dragleave` olayı iç
 * elemanlara girildiğinde de tetikleniyor ve tek bir boolean kullanılsaydı
 * çerçeve dosya alanın üstündeyken sönerdi.
 */

type PendingFile = {
  file: File;
  title: string;
  type: DocumentType;
};

export function DocumentDropzone({
  customerOptions,
  listingOptions,
  /** Müşteri/ilan detayından açıldığında sabitlenen ilişki. */
  fixedCustomerId,
  fixedListingId,
}: {
  customerOptions: { id: string; label: string }[];
  listingOptions: { id: string; label: string }[];
  fixedCustomerId?: string;
  fixedListingId?: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragDepth, setDragDepth] = React.useState(0);
  const [pending, setPending] = React.useState<PendingFile | null>(null);
  const [customerId, setCustomerId] = React.useState(fixedCustomerId ?? "");
  const [listingId, setListingId] = React.useState(fixedListingId ?? "");
  const [progress, setProgress] = React.useState<number | null>(null);

  const isUploading = progress !== null;

  function acceptFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    /* Boyut BURADA da kontrol ediliyor: sunucu sınırı asıl kapı ama 40 MB'lık
       bir dosyayı yükleyip 20 MB sınırında reddettirmek kullanıcının
       bağlantısını boşuna harcar. */
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error("Dosya çok büyük", {
        description: `"${file.name}" ${formatBytes(file.size)}. En fazla ${formatBytes(MAX_DOCUMENT_BYTES)} yükleyebilirsiniz.`,
      });
      return;
    }

    setPending({
      file,
      title: titleFromFileName(file.name),
      type: guessDocumentType(file.name),
    });
  }

  function reset() {
    setPending(null);
    setProgress(null);
    setCustomerId(fixedCustomerId ?? "");
    setListingId(fixedListingId ?? "");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!pending) return;

    const title = pending.title.trim();
    if (!title) {
      toast.error("Başlık gerekli", {
        description: "Belgeyi listede tanıyabilmek için bir başlık yazın.",
      });
      return;
    }

    setProgress(0);

    try {
      /* İKİ ADIM: önce dosya private bucket'a (tarayıcıdan, gerçek ilerleme
         göstergesiyle), sonra kayıt server action'a. Sıra bu çünkü kaydın
         `file_url` alanı yükleme sonucundan geliyor. Kayıt başarısız olursa
         action yüklenen dosyayı kendisi siliyor — yetim kalmasın. */
      const uploaded = await uploadDocument(pending.file, setProgress);

      const result = await createDocument({
        title,
        type: pending.type,
        path: uploaded.path,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
        customerId: customerId || null,
        listingId: listingId || null,
      });

      if (!result.ok) {
        toast.error("Belge kaydedilemedi", { description: result.error });
        setProgress(null);
        return;
      }

      toast.success("Belge yüklendi", { description: title });
      reset();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof UploadError
          ? error.message
          : "Yükleme sırasında beklenmeyen bir hata oluştu.";
      toast.error("Yükleme başarısız", { description: message });
      setProgress(null);
    }
  }

  /* --- Seçilen dosya: onay formu ------------------------------------- */
  if (pending) {
    return (
      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-hairline bg-surface p-4"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <FileUp className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-foreground">
              {pending.file.name}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {formatBytes(pending.file.size)}
            </p>
          </div>
          {!isUploading && (
            <button
              type="button"
              onClick={reset}
              aria-label="Dosyayı kaldır"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {isUploading ? (
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Yükleniyor… %{Math.round(progress * 100)}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document-title">Başlık</Label>
                <Input
                  id="document-title"
                  value={pending.title}
                  onChange={(event) =>
                    setPending({ ...pending, title: event.target.value })
                  }
                  placeholder="Örn. Tapu — Kadıköy dairesi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-type">Belge türü</Label>
                <Select
                  value={pending.type}
                  onValueChange={(value) =>
                    setPending({ ...pending, type: value as DocumentType })
                  }
                >
                  <SelectTrigger id="document-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!fixedCustomerId && (
                <div className="space-y-2">
                  <Label htmlFor="document-customer">
                    İlgili müşteri{" "}
                    <span className="text-muted-foreground">(opsiyonel)</span>
                  </Label>
                  <Select
                    value={customerId || "none"}
                    onValueChange={(value) =>
                      setCustomerId(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger id="document-customer">
                      <SelectValue placeholder="Seçilmedi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {customerOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!fixedListingId && (
                <div className="space-y-2">
                  <Label htmlFor="document-listing">
                    İlgili ilan{" "}
                    <span className="text-muted-foreground">(opsiyonel)</span>
                  </Label>
                  <Select
                    value={listingId || "none"}
                    onValueChange={(value) =>
                      setListingId(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger id="document-listing">
                      <SelectValue placeholder="Seçilmedi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {listingOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Vazgeç
              </Button>
              <Button type="submit">Belgeyi yükle</Button>
            </div>
          </>
        )}
      </form>
    );
  }

  /* --- Boş durum: sürükle-bırak alanı --------------------------------- */
  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setDragDepth((depth) => depth + 1);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragDepth((depth) => Math.max(0, depth - 1));
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        setDragDepth(0);
        acceptFile(event.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
        dragDepth > 0
          ? "border-brand bg-brand-soft"
          : "border-hairline-strong bg-surface-inset hover:border-hairline",
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-xl transition-colors",
          dragDepth > 0
            ? "bg-brand text-brand-foreground"
            : "bg-surface text-muted-foreground",
        )}
      >
        <CloudUpload className="size-5" />
      </span>

      <div className="space-y-1">
        <p className="text-[13.5px] font-medium text-foreground">
          Belgeyi buraya sürükleyin
        </p>
        <p className="text-[12.5px] text-muted-foreground">
          PDF, Word veya görsel · en fazla {formatBytes(MAX_DOCUMENT_BYTES)}
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
      >
        Dosya seç
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_DOCUMENT_ATTRIBUTE}
        onChange={(event) => acceptFile(event.target.files)}
        className="hidden"
      />

      {/* Gizlilik notu: kullanıcı tapusunu yüklerken nereye gittiğini bilmeli. */}
      <p className="max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
        Belgeler herkese açık olmayan bir alanda saklanır; indirme bağlantıları
        kişiye özel üretilir ve kısa sürede geçersiz olur.
      </p>
    </div>
  );
}
