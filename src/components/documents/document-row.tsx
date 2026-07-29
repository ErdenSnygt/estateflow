"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  ScrollText,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import type { DocumentType } from "@/types/database";
import type { DocumentItem } from "@/lib/data/documents";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_TONES } from "@/lib/messaging";
import { formatBytes } from "@/lib/storage/paths";
import { formatShortDate } from "@/lib/format";
import {
  deleteDocument,
  getDocumentDownloadUrl,
  getDocumentPreviewUrl,
} from "@/lib/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Tür ikonları — liste taranırken metni okumadan ayırt edilebilsin diye. */
const ICONS: Record<DocumentType, typeof FileText> = {
  pdf: FileText,
  tapu: ScrollText,
  kimlik: FileImage,
  sozlesme: ScrollText,
};

/**
 * Evrak listesindeki tek satır.
 *
 * -----------------------------------------------------------------------------
 * İNDİRME VE ÖNİZLEME NEDEN TIKLAMAYLA
 * -----------------------------------------------------------------------------
 * Satırda hazır bir `href` YOK. Private bucket'ta kalıcı adres yok; imzalı URL
 * 60 saniyede sönüyor. Sayfa açılırken hepsini imzalamak, kullanıcı bir dakika
 * sonra tıkladığında hepsinin ölü olması demekti.
 *
 * Bunun yerine tıklama bir server action çağırıyor, imza o an üretiliyor ve
 * `window.open` ile hemen kullanılıyor. `noopener` şart: imzalı adresi açan
 * sekmenin bu sayfaya `window.opener` üzerinden erişmesi istenmez.
 */
export function DocumentRow({ document }: { document: DocumentItem }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"download" | "preview" | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const Icon = ICONS[document.document_type];

  async function open(mode: "download" | "preview") {
    setBusy(mode);
    const result =
      mode === "download"
        ? await getDocumentDownloadUrl(document.id)
        : await getDocumentPreviewUrl(document.id);
    setBusy(null);

    if (!result.ok) {
      toast.error(
        mode === "download" ? "İndirilemedi" : "Önizlenemedi",
        { description: result.error },
      );
      return;
    }

    window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteDocument(document.id);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error("Belge silinemedi", { description: result.error });
      return;
    }

    toast.success("Belge silindi", { description: document.title });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-secondary-foreground">
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-[14px] font-medium text-foreground">
              {document.title}
            </p>
            <Badge variant={DOCUMENT_TYPE_TONES[document.document_type]}>
              {DOCUMENT_TYPE_LABELS[document.document_type]}
            </Badge>
          </div>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
            <span className="tabular-nums">
              {formatShortDate(document.created_at)}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{formatBytes(document.file_size)}</span>
            {document.uploader && (
              <>
                <span aria-hidden>·</span>
                <span>{document.uploader.full_name}</span>
              </>
            )}
          </p>

          {/* İlişkiler — belge kime/neye ait olduğu tek bakışta görünsün. */}
          {(document.customer || document.listing) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
              {document.customer && (
                <Link
                  href={`/musteriler/${document.customer.id}`}
                  className="flex items-center gap-1.5 text-secondary-foreground transition-colors hover:text-brand"
                >
                  <UserRound className="size-3.5" />
                  {document.customer.full_name}
                </Link>
              )}
              {document.listing && (
                <Link
                  href={`/ilanlar/${document.listing.id}`}
                  className="flex min-w-0 items-center gap-1.5 text-secondary-foreground transition-colors hover:text-brand"
                >
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="truncate">{document.listing.title}</span>
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => open("preview")}
                disabled={busy !== null}
                aria-label="Önizle"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              >
                {busy === "preview" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>Yeni sekmede aç</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => open("download")}
                disabled={busy !== null}
                aria-label="İndir"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              >
                {busy === "download" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>İndir</TooltipContent>
          </Tooltip>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Belgeyi sil"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Belge silinsin mi?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">
                    {document.title}
                  </span>{" "}
                  ve dosyanın kendisi kalıcı olarak silinecek. Bu işlem geri
                  alınamaz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Siliniyor…" : "Sil"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
