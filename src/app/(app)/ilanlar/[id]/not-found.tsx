import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default async function ListingNotFound() {
  const t = await getTranslations("listings.notFound");

  return (
    <EmptyState
      icon={FileQuestion}
      badge={t("badge")}
      title={t("title")}
      description={t("description")}
      action={
        <Button asChild>
          <Link href="/ilanlar">{t("back")}</Link>
        </Button>
      }
      className="min-h-[460px]"
    />
  );
}
