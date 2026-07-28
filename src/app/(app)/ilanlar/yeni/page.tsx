import type { Metadata } from "next";

import { getAgents } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canAssignAgent } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { ListingForm } from "@/components/listings/listing-form";

export const metadata: Metadata = {
  title: "Yeni İlan",
};

export default async function NewListingPage() {
  const [agents, currentAgent] = await Promise.all([
    getAgents(),
    getCurrentAgent(),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/ilanlar"
        backLabel="İlanlara dön"
        title="Yeni ilan ekle"
        description="Portföyünüze eklenecek gayrimenkulün bilgilerini girin. Taslak olarak kaydedip sonra tamamlayabilirsiniz."
      />

      <ListingForm
        agents={agents}
        currentAgent={currentAgent}
        canReassign={canAssignAgent(currentAgent?.role)}
      />
    </div>
  );
}
