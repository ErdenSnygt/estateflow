import { Skeleton } from "@/components/ui/skeleton";
import { CustomerGridSkeleton } from "@/components/customers/customer-card-skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-[164px]" />
          <Skeleton className="h-8 w-[186px]" />
          <Skeleton className="h-8 w-[172px]" />
        </div>
      </div>

      <CustomerGridSkeleton />
    </div>
  );
}
