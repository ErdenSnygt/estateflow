import { cn } from "@/lib/utils";

/**
 * Placeholder marka işareti — soyut bir "çatı + pencere" formu.
 * Gerçek logo geldiğinde yalnızca bu dosya değişecek.
 */
function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-[12px]",
        "bg-gradient-to-br from-brand to-violet",
        "shadow-[0_2px_10px_-2px_var(--brand-glow)]",
        "after:absolute after:inset-0 after:rounded-[12px] after:bg-gradient-to-b",
        "after:from-white/20 after:to-transparent",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative z-10 size-5 text-white"
        aria-hidden="true"
      >
        <path
          d="M3.5 10.4 12 4l8.5 6.4V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19v-8.6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.75 20.5v-5.25h4.5v5.25"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export { LogoMark };
