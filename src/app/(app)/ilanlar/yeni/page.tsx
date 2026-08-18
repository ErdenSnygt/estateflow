import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getAgents } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canAssignAgent } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { ListingForm } from "@/components/listings/listing-form";
import { ReadOnlyPageGuard } from "@/components/demo/read-only-page-guard";
import { isReadOnlySession } from "@/lib/auth/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("listings");
  return { title: t("form.newTitle") };
}

export default async function NewListingPage() {
  /* Demo hesabi bu sayfayi ACAMAZ (Faz 28): formu doldurup kaydete
     bastiktan sonra reddedilmek, reddi kapida vermekten kotu. */
  if (await isReadOnlySession()) return <ReadOnlyPageGuard />;

  const [agents, currentAgent, t] = await Promise.all([
    getAgents(),
    getCurrentAgent(),
    getTranslations("listings"),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/ilanlar"
        backLabel={t("detail.back")}
        title={t("form.newTitle")}
        description={t("form.newDescription")}
      />

      <ListingForm
        agents={agents}
        currentAgent={currentAgent}
        canReassign={canAssignAgent(currentAgent?.role)}
      />
    </div>
  );
}
