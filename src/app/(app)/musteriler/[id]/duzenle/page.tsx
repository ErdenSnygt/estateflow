import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCustomerById } from "@/lib/data/customers";
import { getAgents } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canAssignAgent } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomerById(id);
  return {
    title: customer ? `${customer.full_name} · Düzenle` : "Müşteri bulunamadı",
  };
}

export default async function EditCustomerPage({ params }: PageProps) {
  const { id } = await params;
  const [customer, agents, currentAgent] = await Promise.all([
    getCustomerById(id),
    getAgents(),
    getCurrentAgent(),
  ]);

  if (!customer) notFound();

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref={`/musteriler/${customer.id}`}
        backLabel="Müşteriye dön"
        title="Müşteriyi düzenle"
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
