"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * ============================================================================
 * ALTTAN AÇILAN ÇEKMECE (bottom sheet)
 * ============================================================================
 * `Dialog` ile aynı Radix ilkelinin üzerine kurulu ama farklı bir amaca
 * hizmet ediyor: dialog ekranın ortasında bir KARAR ister (onay, kısa form),
 * çekmece ise bir LİSTE sunar (menü, filtre) ve parmakla erişilebilir olmak
 * için ekranın altından gelir.
 *
 * Yalnızca alttan açılıyor — yan çekmece eklenmedi çünkü kullanıldığı iki yer
 * de (gezinme menüsü ve filtreler) mobilde başparmak erişim alanında olmalı.
 *
 * `max-h` + iç kaydırma: menü 13 öğe, filtreler dört alan. İçerik ekrandan
 * uzunsa çekmecenin KENDİ içinde kaydırılır; sayfa arkada kaymaz.
 */

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-[#05070C]/70 backdrop-blur-[3px]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        )}
      />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col",
          "rounded-t-2xl border-t border-hairline-strong bg-canvas-subtle",
          "shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.6)]",
          "duration-250 data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className,
        )}
        {...props}
      >
        {/* Tutamak — çekmecenin sürüklenebilir göründüğü tek işaret. Gerçek
            sürükleme yok; dokunmatikte kapatma arkaplana ya da kapat
            düğmesine basarak yapılıyor. */}
        <div
          aria-hidden
          className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-hairline-strong"
        />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "text-[15px] font-semibold tracking-[-0.01em] text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-[12.5px] text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Kaydırılabilir gövde. Alt boşluk telefon çentiği/çubuğu için. */
function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  );
}

function SheetCloseButton() {
  return (
    <DialogPrimitive.Close
      className={cn(
        "shrink-0 rounded-lg p-1.5 text-muted-foreground",
        "transition-colors hover:bg-surface-hover hover:text-foreground",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <X className="size-4" />
      <span className="sr-only">Kapat</span>
    </DialogPrimitive.Close>
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetCloseButton,
};
