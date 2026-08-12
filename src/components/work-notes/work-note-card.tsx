"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  Building2,
  Check,
  CornerDownRight,
  Loader2,
  Paperclip,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import type { WorkNoteFormOptions, WorkNoteThread } from "@/lib/data/work-notes";
import {
  WORK_NOTE_STATUS_TONES,
  WORK_NOTE_TYPE_TONES,
  canResolve,
  notePreview,
} from "@/lib/work-notes";
import { formatRelative } from "@/i18n/dates";
import {
  deleteWorkNote,
  reopenWorkNote,
  resolveWorkNote,
} from "@/lib/actions/work-notes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { WorkNoteIcon } from "@/components/work-notes/work-note-icon";
import { WorkNoteComposer } from "@/components/work-notes/work-note-composer";

/**
 * ============================================================================
 * İŞ NOTU SATIRI
 * ============================================================================
 * Pano (`/mesajlar`), müşteri detayı ve ilan detayı AYNI bileşeni çiziyor —
 * Faz 18'in ana fikri "aynı veri, iki bağlam" olduğu için görünüm de tek
 * yerde duruyor. Fark yalnızca bağlam rozetinde: detay sayfasında zaten o
 * kaydın içindeyiz, oraya giden bir bağlantı göstermek gereksiz.
 *
 * İSTEMCİ BİLEŞENİ çünkü üç eylemi var (çöz, yeniden aç, sil) ve her biri bir
 * server action çağırıp `router.refresh()` diyor. Ayrıca yanıt kutusu açılıp
 * kapanıyor — bu da yerel durum.
 */
export function WorkNoteCard({
  note,
  options,
  reference,
  /** Detay sayfalarında bağlam rozeti gizleniyor: zaten o kaydın içindeyiz. */
  showContext = true,
  highlighted = false,
}: {
  note: WorkNoteThread;
  options: WorkNoteFormOptions;
  reference: number;
  showContext?: boolean;
  highlighted?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("workNotes");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [isReplying, setIsReplying] = React.useState(false);
  const [busy, setBusy] = React.useState<"resolve" | "reopen" | "delete" | null>(
    null,
  );

  async function run(
    kind: "resolve" | "reopen" | "delete",
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
  ) {
    setBusy(kind);
    const result = await action();
    setBusy(null);

    if (!result.ok) {
      toast.error(t("card.actionError"), { description: result.error });
      return;
    }

    toast.success(successMessage);
    router.refresh();
  }

  const isOpen = note.status === "open";

  /* Etiketler DIŞARIDAN veriliyor: `Attachment` bir yardımcı ve not başına iki
     kez çiziliyor — her birinde ayrı bir çeviri aboneliği açmanın anlamı yok
     (`listing-gallery.tsx` içindeki `GalleryArrow` ile aynı gerekçe). */
  /* İçerik yedeği (`notePreview`) de çeviriden: eki olup metni olmayan not
     mümkün ve o satırda "📎 Dosya" yazıyor. */
  const previewLabels = {
    image: t("card.previewImage"),
    file: t("card.previewFile"),
  };

  const attachmentLabels = {
    failed: t("card.attachmentFailed"),
    alt: t("card.attachmentAlt"),
    open: t("card.openAttachment"),
  };

  return (
    <article
      className={cn(
        "rounded-xl border bg-surface p-4 transition-colors",
        highlighted
          ? "border-brand ring-1 ring-brand/30"
          : "border-hairline hover:bg-surface-hover",
      )}
    >
      {/* --- Başlık satırı --- */}
      <div className="flex items-start gap-3">
        <WorkNoteIcon type={note.note_type} />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant={WORK_NOTE_TYPE_TONES[note.note_type]}>
              {t(`type.${note.note_type}`)}
            </Badge>

            {/* Genel notta durum rozeti YOK — takip edilecek bir durumu yok
                (`0012_work_notes.sql`: status kolonu o türde NULL). */}
            {note.status && (
              <Badge variant={WORK_NOTE_STATUS_TONES[note.status]}>
                {t(`status.${note.status}`)}
              </Badge>
            )}

            {showContext && <ContextLinks note={note} />}

            <span className="ml-auto shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
              {formatRelative(format, note.created_at, reference)}
            </span>
          </div>

          {/* --- Yazan + hedef --- */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            {note.author && (
              <span className="flex items-center gap-1.5">
                <AgentAvatar
                  name={note.author.full_name}
                  initials={note.author.initials}
                  src={note.author.avatar_url}
                  size={18}
                />
                <span className="text-secondary-foreground">
                  {note.author.full_name}
                </span>
              </span>
            )}

            {note.mentioned && (
              <span className="text-brand">→ @{note.mentioned.full_name}</span>
            )}

            {note.status === "resolved" && note.resolver && (
              <span>
                · {t("card.resolvedBy", { name: note.resolver.full_name })}
              </span>
            )}
          </div>

          {/* --- İçerik --- */}
          <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-foreground">
            {notePreview(note.content, note.attachment_type, previewLabels)}
          </p>

          <Attachment
            url={note.attachment_signed_url}
            type={note.attachment_type}
            labels={attachmentLabels}
          />
        </div>
      </div>

      {/* --- Yanıtlar --- */}
      {note.replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-hairline pl-3 sm:ml-11">
          {note.replies.map((reply) => (
            <div key={reply.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground">
                <CornerDownRight className="size-3.5" />
                <span className="text-secondary-foreground">
                  {reply.author?.full_name ?? t("card.unknownAuthor")}
                </span>
                <span className="tabular-nums">
                  {formatRelative(format, reply.created_at, reference)}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-secondary-foreground">
                {notePreview(reply.content, reply.attachment_type, previewLabels)}
              </p>
              <Attachment
                url={note.replies_signed.get(reply.id) ?? null}
                type={reply.attachment_type}
                labels={attachmentLabels}
              />
            </div>
          ))}
        </div>
      )}

      {/* --- Eylemler --- */}
      <div className="mt-3 flex flex-wrap items-center gap-2 sm:ml-11">
        {!isReplying && (
          <Button variant="ghost" size="sm" onClick={() => setIsReplying(true)}>
            <CornerDownRight className="size-4" />
            {t("card.reply")}
          </Button>
        )}

        {canResolve(note.status) && (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() =>
              run("resolve", () => resolveWorkNote(note.id), t("card.resolved"))
            }
          >
            {busy === "resolve" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {t("card.resolve")}
          </Button>
        )}

        {note.status === "resolved" && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onClick={() =>
              run("reopen", () => reopenWorkNote(note.id), t("card.reopened"))
            }
          >
            {busy === "reopen" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {t("card.reopen")}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground hover:text-danger"
          disabled={busy !== null}
          onClick={() =>
            run("delete", () => deleteWorkNote(note.id), t("card.deleted"))
          }
        >
          {busy === "delete" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          {tCommon("delete")}
        </Button>
      </div>

      {isReplying && (
        <div className="mt-3 sm:ml-11">
          <WorkNoteComposer
            options={options}
            parentNoteId={note.id}
            onDone={() => setIsReplying(false)}
            compact
          />
        </div>
      )}

      {/* Açık notta soldan ince bir vurgu: panoda göz önce eyleme çağıran
          satırlara gitsin. Renk yerine kenar kullanılıyor — arka plan tonu
          kart hover'ıyla çakışırdı. */}
      {isOpen && <span className="sr-only">{t("card.openSr")}</span>}
    </article>
  );
}

/* ==========================================================================
   Parçalar
   ========================================================================== */

/** Notun bağlı olduğu kayıtlara giden rozetler — ikisi birden olabilir. */
function ContextLinks({ note }: { note: WorkNoteThread }) {
  return (
    <>
      {note.customer && (
        <Link
          href={`/musteriler/${note.customer.id}`}
          className="flex max-w-[12rem] items-center gap-1 rounded-md bg-surface-inset px-2 py-0.5 text-[11.5px] text-secondary-foreground transition-colors hover:text-brand"
        >
          <UserRound className="size-3 shrink-0" />
          <span className="truncate">{note.customer.full_name}</span>
        </Link>
      )}
      {note.listing && (
        <Link
          href={`/ilanlar/${note.listing.id}`}
          className="flex max-w-[14rem] items-center gap-1 rounded-md bg-surface-inset px-2 py-0.5 text-[11.5px] text-secondary-foreground transition-colors hover:text-brand"
        >
          <Building2 className="size-3 shrink-0" />
          <span className="truncate">{note.listing.title}</span>
        </Link>
      )}
    </>
  );
}

/**
 * Ek gösterimi.
 *
 * İMZA 60 SANİYEDE SÖNÜYOR ve bu adres sunucuda, sayfa çizilirken üretildi.
 * Sayfa uzun süre açık kaldığında bağlantı ölür — kullanıcı yenilediğinde
 * yeni imza gelir. Alternatif her tıklamada bir action çağırmaktı; evrak
 * listesinde öyle yapılıyor (`data/documents.ts`), ama orada satır başına bir
 * indirme düğmesi var, burada ek satırın parçası ve görsel önizlemesi
 * doğrudan adres istiyor.
 */
function Attachment({
  url,
  type,
  labels,
}: {
  url: string | null;
  type: "image" | "file" | null;
  labels: { failed: string; alt: string; open: string };
}) {
  if (!type) return null;

  if (!url) {
    return (
      <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Paperclip className="size-3.5" />
        {labels.failed}
      </p>
    );
  }

  if (type === "image") {
    return (
      /* `next/image` KULLANILMIYOR: imzalı adres her çizimde değişiyor ve
         optimize edici onu önbelleğe alamıyor — üstelik `next.config`
         listesine private bucket'ı eklemek gerekirdi. */
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={labels.alt}
          className="max-h-48 rounded-lg border border-hairline object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] text-secondary-foreground transition-colors hover:bg-surface-hover hover:text-brand"
    >
      <Paperclip className="size-3.5" />
      {labels.open}
    </a>
  );
}
