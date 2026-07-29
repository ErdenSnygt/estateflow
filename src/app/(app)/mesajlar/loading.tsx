import { PageHeaderSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/mesajlar` yüklenirken.
 *
 * Yükseklik ve ızgara GERÇEK SAYFAYLA BİREBİR aynı (`dvh` hesabı ve
 * `md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]`) — iki panelli düzende
 * ölçü sapması, yükleme bitince gözle görülür bir zıplama üretiyor.
 */
export default function MesajlarLoading() {
  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[26rem] flex-col gap-4 md:h-[calc(100dvh-9rem)]">
      <PageHeaderSkeleton />

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-hairline bg-surface md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        {/* Sol panel: arama + konuşma listesi */}
        <aside className="min-h-0 md:border-r md:border-hairline">
          <div className="border-b border-hairline p-3">
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-1 p-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3 px-3 py-2.5">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Sağ panel: masaüstünde boş durum alanı */}
        <section className="hidden min-h-0 flex-col md:flex">
          <div className="flex items-center gap-3 border-b border-hairline px-3 py-2.5">
            <Skeleton className="size-[38px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>

          <div className="flex-1 space-y-3 p-4">
            {[
              "w-2/5 ml-auto",
              "w-1/2",
              "w-1/3 ml-auto",
              "w-2/5",
              "w-1/2 ml-auto",
            ].map((width, index) => (
              <Skeleton key={index} className={`h-12 rounded-2xl ${width}`} />
            ))}
          </div>

          <div className="border-t border-hairline p-3">
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  );
}
