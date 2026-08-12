import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

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
  const [listing, t, tCommon] = await Promise.all([
    getListingById(id),
    getTranslations("listings"),
    getTranslations("common"),
  ]);
  return {
    title: listing
      ? `${listing.title} · ${tCommon("edit")}`
      : t("notFound.title"),
  };
}

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const [listing, agents, currentAgent, t] = await Promise.all([
    getListingById(id),
    getAgents(),
    getCurrentAgent(),
    getTranslations("listings"),
  ]);

  if (!listing) notFound();

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref={`/ilanlar/${listing.id}`}
        backLabel={t("form.editBack")}
        title={t("form.editTitle")}
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
