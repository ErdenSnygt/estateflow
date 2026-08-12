import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRoundX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default async function CustomerNotFound() {
  const t = await getTranslations("customers.notFound");

  return (
    <EmptyState
      icon={UserRoundX}
      badge={t("badge")}
      title={t("title")}
      description={t("description")}
      action={
        <Button asChild>
          <Link href="/musteriler">{t("back")}</Link>
        </Button>
      }
      className="min-h-[460px]"
    />
  );
}
