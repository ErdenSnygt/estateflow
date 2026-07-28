import type { Metadata } from "next";

import { getAgents } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canAssignAgent } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";

export const metadata: Metadata = {
  title: "Yeni Müşteri",
};

export default async function NewCustomerPage() {
  const [agents, currentAgent] = await Promise.all([
    getAgents(),
    getCurrentAgent(),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/musteriler"
        backLabel="Müşterilere dön"
        title="Yeni müşteri ekle"
        description="Kayıt oluşturduktan sonra ilgilendiği ilanları ve görüşme geçmişini müşteri detayından takip edebilirsiniz."
      />

      <CustomerForm
        agents={agents}
        currentAgent={currentAgent}
        canReassign={canAssignAgent(currentAgent?.role)}
      />
    </div>
  );
}
