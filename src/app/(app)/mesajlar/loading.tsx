import { PageHeaderSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/mesajlar` yüklenirken.
 *
 * İskelet GERÇEK SAYFAYLA AYNI SIRADA: başlık, not formu, sekmeler + filtre,
 * not listesi. Sıra ya da yükseklik sapması, yükleme bitince gözle görülür bir
 * zıplama üretiyor — Faz 15'te tüm `loading.tsx` dosyalarına uygulanan kural.
 */
export default function MesajlarLoading() {
  return (
    <div className="space-y-6 pb-4">
      <PageHeaderSkeleton />

      {/* Not yazma formu */}
      <div className="space-y-4 rounded-xl border border-hairline bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-[74px] w-full rounded-lg" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Sekmeler */}
      <div className="space-y-3">
        <div className="flex gap-1">
          {["w-24", "w-24", "w-20", "w-24"].map((width, index) => (
            <Skeleton key={index} className={`h-8 rounded-lg ${width}`} />
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-surface p-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-9 w-[220px] rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-[160px] rounded-lg" />
          </div>
        </div>
      </div>

      {/* Not satırları */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-xl border border-hairline bg-surface p-4"
          >
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-md" />
              </div>
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
