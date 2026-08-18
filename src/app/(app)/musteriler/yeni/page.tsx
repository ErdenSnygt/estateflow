import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getAgents } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canAssignAgent } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { ReadOnlyPageGuard } from "@/components/demo/read-only-page-guard";
import { isReadOnlySession } from "@/lib/auth/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers.form");
  return { title: t("metaNew") };
}

export default async function NewCustomerPage() {
  /* Demo hesabi bu sayfayi ACAMAZ (Faz 28): formu doldurup kaydete
     bastiktan sonra reddedilmek, reddi kapida vermekten kotu. */
  if (await isReadOnlySession()) return <ReadOnlyPageGuard />;

  const [agents, currentAgent, t, tDetail] = await Promise.all([
    getAgents(),
    getCurrentAgent(),
    getTranslations("customers.form"),
    getTranslations("customers.detail"),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/musteriler"
        backLabel={tDetail("back")}
        title={t("newTitle")}
        description={t("newDescription")}
      />

      <CustomerForm
        agents={agents}
        currentAgent={currentAgent}
        canReassign={canAssignAgent(currentAgent?.role)}
      />
    </div>
  );
}
