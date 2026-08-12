"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";

import type { WorkNoteType } from "@/types/database";
import { WORK_NOTE_TYPES, withMention, withoutMention } from "@/lib/work-notes";
import { attachmentKindFor } from "@/lib/documents";
import { MAX_DOCUMENT_BYTES, ACCEPT_DOCUMENT_ATTRIBUTE } from "@/lib/storage/paths";
import { formatBytes } from "@/i18n/numbers";
import { useUploadErrorMessage } from "@/i18n/upload-error";
import { createWorkNote } from "@/lib/actions/work-notes";
import type { WorkNoteFormOptions } from "@/lib/data/work-notes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * ============================================================================
 * İŞ NOTU YAZMA
 * ============================================================================
 * Tek bir bileşen ÜÇ BAĞLAMDA kullanılıyor: pano (`/mesajlar`), müşteri detayı
 * ve ilan detayı. Detay sayfalarında bağlam sabit — orada müşteri/ilan seçici
 * hiç çizilmiyor, çünkü cevabı zaten belli bir soruyu sormak kullanıcıyı
 * yavaşlatır (`DocumentDropzone`daki `fixedCustomerId` ile aynı desen).
 *
 * -----------------------------------------------------------------------------
 * @MENTION BİR AÇILIR, SERBEST METİN DEĞİL
 * -----------------------------------------------------------------------------
 * Metnin içine "@" yazıp otomatik tamamlama açmak tanıdık bir etkileşim ama
 * burada yanlış araç: kaydedilen şey `mentioned_agent_id`, yani bir KİMLİK.
 * Serbest metinden kimlik çıkarmak iki "Mehmet" olduğunda çöküyor, isim
 * değişince eski notlar kırılıyor ve sidebar rozeti bir metin araması yapamaz.
 *
 * Açılırdan seçim metne de yansıyor (`withMention`) — okuyan kişi "@Mehmet"
 * görüyor, veritabanı kimliği tutuyor. İkisi de doğru.
 *
 * -----------------------------------------------------------------------------
 * ATAMA SEÇİLDİĞİNDE UYARI ÇIKIYOR
 * -----------------------------------------------------------------------------
 * Bu tür bir not GERÇEK bir devir yapıyor. Kullanıcı düğmeye basmadan önce
 * bunu okumalı; "not yazdım sandım, müşterim elimden gitti" kabul edilebilir
 * bir sürpriz değil.
 */
export function WorkNoteComposer({
  options,
  fixedCustomerId,
  fixedListingId,
  /** Doluysa bu bir yanıt kutusu: tür, bağlam ve @mention devre dışı. */
  parentNoteId,
  onDone,
  compact = false,
}: {
  options: WorkNoteFormOptions;
  fixedCustomerId?: string;
  fixedListingId?: string;
  parentNoteId?: string;
  onDone?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("workNotes");
  const format = useFormatter();
  const uploadMessage = useUploadErrorMessage();
  const tCommon = useTranslations("common");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isReply = Boolean(parentNoteId);

  const [type, setType] = React.useState<WorkNoteType>(isReply ? "note" : "question");
  const [customerId, setCustomerId] = React.useState(fixedCustomerId ?? "");
  const [listingId, setListingId] = React.useState(fixedListingId ?? "");
  const [mentionId, setMentionId] = React.useState("");
  const [content, setContent] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const isBusy = isSaving || progress !== null;

  function reset() {
    setType(isReply ? "note" : "question");
    setCustomerId(fixedCustomerId ?? "");
    setListingId(fixedListingId ?? "");
    setMentionId("");
    setContent("");
    setFile(null);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  /* Seçim değişince metindeki jeton da değişiyor: eskisi sökülüyor, yenisi
     ekleniyor. Kullanıcı metni elle düzenlediyse dokunulmuyor
     (`withMention` zaten varsa tekrar eklemiyor). */
  function changeMention(next: string) {
    const previous = options.agents.find((agent) => agent.id === mentionId);
    const upcoming = options.agents.find((agent) => agent.id === next);

    setContent((current) => {
      let text = previous ? withoutMention(current, previous.label) : current;
      if (upcoming) text = withMention(text, upcoming.label);
      return text;
    });

    setMentionId(next);
  }

  function acceptFile(files: FileList | null) {
    const picked = files?.[0];
    if (!picked) return;

    /* Sunucu sınırı asıl kapı ama 40 MB'lık bir dosyayı yükleyip 20 MB'da
       reddettirmek kullanıcının bağlantısını boşuna harcar
       (`DocumentDropzone` ile aynı kontrol). */
    if (picked.size > MAX_DOCUMENT_BYTES) {
      toast.error(t("composer.tooLargeTitle"), {
        description: t("composer.tooLargeBody", {
          name: picked.name,
          size: formatBytes(format, picked.size),
          max: formatBytes(format, MAX_DOCUMENT_BYTES),
        }),
      });
      return;
    }

    setFile(picked);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isBusy) return;

    const text = content.trim();
    if (!text && !file) {
      toast.error(t("composer.emptyTitle"), {
        description: t("composer.emptyBody"),
      });
      return;
    }

    if (!isReply && !customerId && !listingId) {
      toast.error(t("composer.noContextTitle"), {
        description: t("composer.noContextBody"),
      });
      return;
    }

    setIsSaving(true);

    try {
      /* İKİ ADIM: önce dosya private bucket'a (tarayıcıdan, gerçek ilerleme
         göstergesiyle), sonra kayıt server action'a. Kayıt başarısız olursa
         action yüklenen dosyayı kendisi siliyor — yetim kalmasın. */
      let attachment: { path: string; mimeType: string } | null = null;

      if (file) {
        setProgress(0);
        const { uploadDocument } = await import("@/lib/storage/upload-document");
        const uploaded = await uploadDocument(file, setProgress);
        attachment = { path: uploaded.path, mimeType: uploaded.mimeType };
        setProgress(null);
      }

      const result = await createWorkNote({
        customerId: customerId || null,
        listingId: listingId || null,
        type,
        content: text,
        mentionedAgentId: mentionId || null,
        attachmentPath: attachment?.path ?? null,
        attachmentType: attachment ? attachmentKindFor(attachment.mimeType) : null,
        parentNoteId: parentNoteId ?? null,
      });

      if (!result.ok) {
        toast.error(t("composer.saveErrorTitle"), { description: result.error });
        return;
      }

      toast.success(
        isReply
          ? t("composer.successReply")
          : type === "assignment"
            ? t("composer.successAssignment")
            : t("composer.successNote"),
      );
      reset();
      onDone?.();
      router.refresh();
    } catch (error) {
      toast.error(t("composer.failedTitle"), {
        description: uploadMessage(error, t("composer.unexpectedError")),
      });
      setProgress(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className={
        compact
          ? "space-y-3"
          : "space-y-4 rounded-xl border border-hairline bg-surface p-4"
      }
    >
      {!isReply && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="note-type">{t("composer.typeLabel")}</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as WorkNoteType)}
            >
              <SelectTrigger id="note-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_NOTE_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`type.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!fixedCustomerId && (
            <div className="space-y-1.5">
              <Label htmlFor="note-customer">
                {t("composer.customerLabel")}{" "}
                <span className="text-muted-foreground">
                  {tCommon("optional")}
                </span>
              </Label>
              <Select
                value={customerId || "none"}
                onValueChange={(value) =>
                  setCustomerId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="note-customer">
                  <SelectValue placeholder={t("composer.notSelected")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("composer.notSelected")}</SelectItem>
                  {options.customers.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!fixedListingId && (
            <div className="space-y-1.5">
              <Label htmlFor="note-listing">
                {t("composer.listingLabel")}{" "}
                <span className="text-muted-foreground">
                  {tCommon("optional")}
                </span>
              </Label>
              <Select
                value={listingId || "none"}
                onValueChange={(value) =>
                  setListingId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="note-listing">
                  <SelectValue placeholder={t("composer.notSelected")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("composer.notSelected")}</SelectItem>
                  {options.listings.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="note-mention">
              {type === "assignment"
                ? t("composer.mentionLabelAssignment")
                : t("composer.mentionLabelDefault")}{" "}
              <span className="text-muted-foreground">
                {tCommon("optional")}
              </span>
            </Label>
            <Select
              value={mentionId || "none"}
              onValueChange={(value) =>
                changeMention(value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="note-mention">
                <SelectValue placeholder={t("composer.everyone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {type === "assignment"
                    ? t("composer.selfAssign")
                    : t("composer.everyone")}
                </SelectItem>
                {options.agents.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!isReply && (
        <p
          className={
            type === "assignment"
              ? "rounded-lg bg-warning-soft px-3 py-2 text-[12px] leading-relaxed text-warning"
              : "text-[12px] leading-relaxed text-muted-foreground"
          }
        >
          {t(`typeHint.${type}`)}
        </p>
      )}

      <div className="space-y-1.5">
        {!isReply && (
          <Label htmlFor="note-content">{t("composer.contentLabel")}</Label>
        )}
        <Textarea
          id={isReply ? undefined : "note-content"}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={isReply ? 2 : 3}
          placeholder={
            isReply
              ? t("composer.placeholderReply")
              : type === "question"
                ? t("composer.placeholderQuestion")
                : type === "assignment"
                  ? t("composer.placeholderAssignment")
                  : t("composer.placeholderNote")
          }
        />
      </div>

      {/* --- Ek --- */}
      {file && (
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface-inset px-3 py-2">
          <Paperclip className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
            {file.name}
          </span>
          <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
            {formatBytes(format, file.size)}
          </span>
          {!isBusy && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label={t("composer.removeAttachment")}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {progress !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
        >
          <Paperclip className="size-4" />
          {t("composer.attach")}
        </Button>

        <div className="flex items-center gap-2">
          {onDone && (
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              {tCommon("cancel")}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isBusy}>
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isReply
              ? t("composer.submitReply")
              : type === "assignment"
                ? t("composer.submitAssignment")
                : t("composer.submitNote")}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_DOCUMENT_ATTRIBUTE}
        onChange={(event) => acceptFile(event.target.files)}
        className="hidden"
      />
    </form>
  );
}
