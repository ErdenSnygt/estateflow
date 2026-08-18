import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCustomerById } from "@/lib/data/customers";
import { getAgents } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canAssignAgent } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { ReadOnlyPageGuard } from "@/components/demo/read-only-page-guard";
import { isReadOnlySession } from "@/lib/auth/server";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [customer, t, tCommon] = await Promise.all([
    getCustomerById(id),
    getTranslations("customers"),
    getTranslations("common"),
  ]);
  return {
    title: customer
      ? `${customer.full_name} · ${tCommon("edit")}`
      : t("notFound.title"),
  };
}

export default async function EditCustomerPage({ params }: PageProps) {
  /* Demo hesabi bu sayfayi ACAMAZ (Faz 28): formu doldurup kaydete
     bastiktan sonra reddedilmek, reddi kapida vermekten kotu. */
  if (await isReadOnlySession()) return <ReadOnlyPageGuard />;

  const { id } = await params;
  const [customer, agents, currentAgent, t] = await Promise.all([
    getCustomerById(id),
    getAgents(),
    getCurrentAgent(),
    getTranslations("customers.form"),
  ]);

  if (!customer) notFound();

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref={`/musteriler/${customer.id}`}
        backLabel={t("editBack")}
        title={t("editTitle")}
        description={`${customer.id.toUpperCase()} · ${customer.full_name}`}
      />

      <CustomerForm
        customer={customer}
        agents={agents}
        currentAgent={currentAgent}
        canReassign={canAssignAgent(currentAgent?.role)}
      />
    </div>
  );
}
