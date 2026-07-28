import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentsLoading() {
  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-[30rem] max-w-full" />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-[86px]" />
          <Skeleton className="h-8 w-[74px]" />
          <Skeleton className="h-5 w-52" />
          <Skeleton className="ml-auto h-9 w-[184px]" />
        </div>

        <Skeleton className="h-[62px] w-full" />
        {/* Izgaranın kendisi — `TimeGrid` ile aynı yükseklik bandı. */}
        <Skeleton className="h-[min(62vh,660px)] w-full" />
      </div>
    </div>
  );
}
