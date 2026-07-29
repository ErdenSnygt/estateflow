"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { MESSAGE_TEMPLATES, attachmentKindFor } from "@/lib/messaging";
import {
  ACCEPT_DOCUMENT_ATTRIBUTE,
  MAX_DOCUMENT_BYTES,
  formatBytes,
} from "@/lib/storage/paths";
import { UploadError } from "@/lib/storage/upload";
import { uploadDocument } from "@/lib/storage/upload-document";
import { sendMessage } from "@/lib/actions/messages";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * ============================================================================
 * MESAJ YAZMA ALANI
 * ============================================================================
 * Üç iş yapıyor: metin, ek ve hazır şablon.
 *
 * -----------------------------------------------------------------------------
 * EK ÖNCE YÜKLENİYOR, SONRA MESAJ YAZILIYOR
 * -----------------------------------------------------------------------------
 * Dosya private bucket'a tarayıcıdan gidiyor (`uploadDocument`), dönen NESNE
 * YOLU mesaj satırına yazılıyor. Sıra tersine çevrilemez: mesajın
 * `attachment_url` alanı yükleme sonucundan geliyor. Mesaj yazılamazsa action
 * yüklenen dosyayı kendisi siliyor — yetim kalmasın.
 *
 * Ekler EVRAK BUCKET'INA gidiyor, ayrı bir yere değil: bir müşteriye
 * gönderilen kimlik fotokopisi de en az arşivdeki kadar hassas ve aynı
 * korumayı hak ediyor.
 *
 * -----------------------------------------------------------------------------
 * ENTER GÖNDERİR, SHIFT+ENTER SATIR ATLAR
 * -----------------------------------------------------------------------------
 * Sohbet arayüzlerinin yerleşik davranışı. Mobilde bu kural UYGULANMIYOR:
 * telefon klavyesinde Enter satır atlamak için kullanılıyor ve gönder düğmesi
 * zaten parmağın altında.
 */
export function MessageComposer({
  conversationId,
  customerId,
  onSent,
}: {
  /** Mevcut konuşma. Yoksa `customerId` ile yeni konuşma açılır. */
  conversationId?: string;
  customerId?: string;
  onSent?: (conversationId: string) => void;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [isSending, setIsSending] = React.useState(false);

  const isBusy = isSending || progress !== null;
  const canSend = (content.trim().length > 0 || file !== null) && !isBusy;

  function pickFile(files: FileList | null) {
    const selected = files?.[0];
    if (!selected) return;

    if (selected.size > MAX_DOCUMENT_BYTES) {
      toast.error("Dosya çok büyük", {
        description: `En fazla ${formatBytes(MAX_DOCUMENT_BYTES)} gönderebilirsiniz.`,
      });
      return;
    }
    setFile(selected);
  }

  function applyTemplate(text: string) {
    /* Şablon mevcut metnin ÜSTÜNE YAZMIYOR, sonuna ekleniyor: kullanıcı bir
       şey yazmışsa onu silmek kaba olurdu. */
    setContent((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text));
    textareaRef.current?.focus();
  }

  async function submit() {
    if (!canSend) return;

    setIsSending(true);

    try {
      let attachmentPath: string | null = null;
      let attachmentType: "image" | "file" | null = null;

      if (file) {
        setProgress(0);
        const uploaded = await uploadDocument(file, setProgress);
        attachmentPath = uploaded.path;
        attachmentType = attachmentKindFor(uploaded.mimeType);
        setProgress(null);
      }

      const result = await sendMessage({
        conversationId,
        customerId,
        content,
        attachmentPath,
        attachmentType,
      });

      if (!result.ok) {
        toast.error("Mesaj gönderilemedi", { description: result.error });
        return;
      }

      setContent("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onSent?.(result.data.conversationId);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof UploadError
          ? error.message
          : "Beklenmeyen bir hata oluştu.";
      toast.error("Gönderilemedi", { description: message });
    } finally {
      setIsSending(false);
      setProgress(null);
    }
  }

  return (
    <div className="shrink-0 space-y-2 border-t border-hairline p-3">
      {/* --- Seçilen ek --- */}
      {file && (
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface-inset px-3 py-2">
          <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-secondary-foreground">
            {file.name}
          </span>
          <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
            {formatBytes(file.size)}
          </span>
          {!isBusy && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Eki kaldır"
              className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {progress !== null && (
        <div className="h-1 overflow-hidden rounded-full bg-surface-inset">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* --- Şablonlar --- */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Hazır şablonlar"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground data-[state=open]:bg-surface-hover data-[state=open]:text-foreground"
            >
              <Sparkles className="size-[18px]" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            className="w-[min(20rem,calc(100vw-2rem))] p-1.5"
          >
            <p className="px-2 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Hazır mesajlar
            </p>
            <div className="space-y-0.5">
              {MESSAGE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template.text)}
                  className="block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
                >
                  <span className="block text-[12.5px] font-medium text-foreground">
                    {template.label}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
                    {template.text}
                  </span>
                </button>
              ))}
            </div>
            <p className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Şablon metni kutuya eklenir; göndermeden önce
              kişiselleştirebilirsiniz.
            </p>
          </PopoverContent>
        </Popover>

        {/* --- Ek --- */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          aria-label="Dosya ekle"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
        >
          <Paperclip className="size-[18px]" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_DOCUMENT_ATTRIBUTE}
          onChange={(event) => pickFile(event.target.files)}
          className="hidden"
        />

        {/* --- Metin --- */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            /* `event.shiftKey` yoksa gönder — ama yalnızca fiziksel klavyede.
               Dokunmatikte `matchMedia` ile ayırt ediliyor; telefonda Enter
               satır atlamalı. */
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              window.matchMedia("(pointer: fine)").matches
            ) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Mesajınızı yazın…"
          rows={1}
          className="max-h-32 min-h-[38px] flex-1 resize-none py-2"
        />

        {/* --- Gönder --- */}
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Gönder"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            canSend
              ? "bg-brand text-brand-foreground hover:bg-brand-hover"
              : "bg-surface-inset text-muted-foreground",
          )}
        >
          {isBusy ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : (
            <Send className="size-[18px]" />
          )}
        </button>
      </div>
    </div>
  );
}
