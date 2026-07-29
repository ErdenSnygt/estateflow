import {
  FilterBarSkeleton,
  ListRowsSkeleton,
  PageHeaderSkeleton,
  StatTilesSkeleton,
} from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** `/evraklar` yüklenirken — özet, yükleme alanı, filtre, liste. */
export default function EvraklarLoading() {
  return (
    <div className="space-y-6 pb-4">
      <PageHeaderSkeleton />

      {/* Beş kutu: toplam + dört belge türü */}
      <StatTilesSkeleton
        count={5}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      />

      {/* Sürükle-bırak alanı */}
      <Skeleton className="h-[196px] w-full rounded-xl" />

      <FilterBarSkeleton />
      <ListRowsSkeleton />
    </div>
  );
}
