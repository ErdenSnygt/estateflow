import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /* `string` DEĞİL, `ReactNode`: dashboard başlığı saate göre değişiyor ve
     metni bir istemci bileşeni üretiyor (`dashboard/greeting.tsx`). Diğer
     bütün sayfalar düz metin geçmeye devam ediyor. */
  title: React.ReactNode;
  description?: string;
  /** Sağ tarafta duran birincil/ikincil aksiyonlar. */
  actions?: React.ReactNode;
  /** Verilirse başlığın üstünde bir geri bağlantısı gösterilir. */
  backHref?: string;
  backLabel?: string;
  className?: string;
};

/**
 * Modül sayfalarının ortak başlığı. Navbar'daki başlık gezinme içindir;
 * bu başlık sayfanın kendi bağlamını ve aksiyonlarını taşır.
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Geri",
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {backHref && (
          <Link
            href={backHref}
            className={cn(
              "-ml-1 mb-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5",
              "text-[12.5px] font-medium text-muted-foreground",
              "transition-colors hover:text-foreground",
            )}
          >
            <ChevronLeft className="size-3.5" />
            {backLabel}
          </Link>
        )}

        <h2 className="truncate text-[22px] font-semibold tracking-[-0.025em] text-foreground">
          {title}
        </h2>

        {description && (
          <p className="text-[13.5px] leading-relaxed text-secondary-foreground">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
