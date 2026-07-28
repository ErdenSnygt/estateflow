import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getListingById } from "@/lib/data/listings";
import { getAgents } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canAssignAgent } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { ListingForm } from "@/components/listings/listing-form";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  return {
    title: listing ? `${listing.title} · Düzenle` : "İlan bulunamadı",
  };
}

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const [listing, agents, currentAgent] = await Promise.all([
    getListingById(id),
    getAgents(),
    getCurrentAgent(),
  ]);

  if (!listing) notFound();

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref={`/ilanlar/${listing.id}`}
        backLabel="İlana dön"
        title="İlanı düzenle"
        description={`${listing.id.toUpperCase()} · ${listing.title}`}
      />

      <ListingForm
        listing={listing}
        agents={agents}
        currentAgent={currentAgent}
        canReassign={canAssignAgent(currentAgent?.role)}
      />
    </div>
  );
}
