import {
  FilterBarSkeleton,
  ListRowsSkeleton,
  PageHeaderSkeleton,
} from "@/components/page-skeletons";

/** `/satislar/teklifler` yüklenirken. */
export default function TekliflerLoading() {
  return (
    <div className="space-y-6 pb-4">
      <PageHeaderSkeleton withAction />
      <FilterBarSkeleton />
      <ListRowsSkeleton count={6} />
    </div>
  );
}
