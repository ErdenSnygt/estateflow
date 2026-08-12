import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getAgents } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canAssignAgent } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers.form");
  return { title: t("metaNew") };
}

export default async function NewCustomerPage() {
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
