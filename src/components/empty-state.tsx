import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Alt kısımda gösterilecek opsiyonel aksiyon (buton vb.). */
  action?: React.ReactNode;
  /**
   * Başlığın üstünde görünen küçük rozet.
   *
   * ZORUNLU (Faz 19). Önceki sürümde varsayılanı `"Yakında"` diye SABİT
   * TÜRKÇE bir metindi; çağıranların hepsi zaten kendi rozetini geçtiği için
   * o varsayılan ölüydü ve çeviri geçişinde gözden kaçacak bir metin olarak
   * duruyordu. Kaldırıldı — metin çağıranın (modül sayfasının) sorumluluğu. */
  badge: string;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  badge,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-card relative flex min-h-[calc(100svh-8.5rem)] items-center justify-center overflow-hidden px-6 py-20",
        className,
      )}
    >
      {/* Dekoratif zemin: ince nokta ızgara + merkezde yumuşak ışık */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(60%_55%_at_50%_45%,black,transparent)]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-[60%] rounded-full bg-[radial-gradient(circle,rgba(76,125,255,0.10),transparent_65%)] blur-[2px]"
      />

      <div className="relative flex max-w-md flex-col items-center text-center">
        {/* İkon çerçevesi */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-brand/20 blur-xl"
          />
          <div
            className={cn(
              "hairline-top relative flex size-16 items-center justify-center rounded-2xl",
              "border border-hairline-strong bg-surface-hover shadow-md",
            )}
          >
            <Icon className="size-7 text-brand" strokeWidth={1.6} />
          </div>
        </div>

        <span
          className={cn(
            "mt-6 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
            "border border-hairline bg-brand-soft",
            "text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand",
          )}
        >
          <span className="size-1.5 rounded-full bg-brand" />
          {badge}
        </span>

        <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.025em] text-foreground">
          {title}
        </h2>

        <p className="mt-2.5 text-[14px] leading-relaxed text-secondary-foreground">
          {description}
        </p>

        {action ? <div className="mt-7">{action}</div> : null}
      </div>
    </div>
  );
}
