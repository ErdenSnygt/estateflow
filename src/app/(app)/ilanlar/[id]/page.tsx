import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Eye,
  Heart,
  Mail,
  MapPin,
  Maximize2,
  Pencil,
  Phone,
} from "lucide-react";

import { getListingById, getRelatedListings } from "@/lib/data/listings";
import { getAgentById } from "@/lib/data/agents";
import { getInterestedCustomers } from "@/lib/data/customers";
import { getAppointmentsForListing } from "@/lib/data/appointments";
import { getDocumentsForListing } from "@/lib/data/documents";
import {
  CATEGORY_LABELS,
  formatListingPrice,
  formatRooms,
  isResidential,
} from "@/lib/listings";
import {
  formatArea,
  formatCurrency,
  formatDate,
  formatNumber,
  formatShortDate,
} from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { ListingMap } from "@/components/listings/listing-map";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";
import { DeleteListingDialog } from "@/components/listings/delete-listing-dialog";
import { OfferDialog } from "@/components/offers/offer-dialog";
import { ListingCard } from "@/components/listings/listing-card";
import { AppointmentRow } from "@/components/appointments/appointment-row";
import { RelatedDocuments } from "@/components/documents/related-documents";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  return { title: listing?.title ?? "İlan bulunamadı" };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) notFound();

  const [agent, related, interested, appointments, documents] =
    await Promise.all([
      getAgentById(listing.agent_id),
      getRelatedListings(listing),
      getInterestedCustomers(listing.id),
      getAppointmentsForListing(listing.id),
      getDocumentsForListing(listing.id),
    ]);

  const pricePerSqm = Math.round(listing.price / listing.area_sqm);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/ilanlar"
        backLabel="İlanlara dön"
        title={listing.title}
        description={`${listing.address} · ${listing.district}, ${listing.city}`}
        actions={
          <>
            {/* Satılmış ilana yeni teklif alınamaz; sunucu da reddediyor. */}
            {listing.status !== "satildi" && (
              <OfferDialog
                listing={{ id: listing.id, title: listing.title }}
                customerOptions={interested.map((customer) => ({
                  id: customer.id,
                  label: customer.full_name,
                  hint: customer.phone,
                }))}
                suggestedAmount={listing.price}
              />
            )}
            <Button variant="secondary" asChild>
              <Link href={`/ilanlar/${listing.id}/duzenle`}>
                <Pencil className="size-4" />
                Düzenle
              </Link>
            </Button>
            <DeleteListingDialog
              listingId={listing.id}
              listingTitle={listing.title}
            />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* --- Sol sütun ---
            `min-w-0`: grid öğeleri varsayılan olarak `min-width: auto` alır,
            galerinin küçük resim şeridi hücreyi dışarı doğru itiyordu. */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <ListingGallery images={listing.images} title={listing.title} />

          <Card>
            <CardHeader>
              <CardTitle>Açıklama</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-[14px] leading-[1.75] text-secondary-foreground">
                {listing.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Özellikler</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
                <DetailRow label="İlan no" value={listing.id.toUpperCase()} />
                <DetailRow
                  label="Kategori"
                  value={CATEGORY_LABELS[listing.category]}
                />
                <DetailRow label="Alan" value={formatArea(listing.area_sqm)} />
                {isResidential(listing.category) && listing.room_count > 0 && (
                  <DetailRow
                    label="Oda sayısı"
                    value={formatRooms(listing.room_count)}
                  />
                )}
                <DetailRow
                  label="m² birim fiyat"
                  value={formatCurrency(pricePerSqm, listing.currency)}
                />
                <DetailRow label="Şehir / İlçe" value={`${listing.city} / ${listing.district}`} />
                <DetailRow
                  label="Yayın tarihi"
                  value={formatDate(listing.published_at)}
                />
                <DetailRow
                  label="Son güncelleme"
                  value={formatDate(listing.updated_at)}
                />
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* --- Sağ sütun --- */}
        <div className="space-y-6">
          <Card className="hairline-top">
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <ListingStatusBadge status={listing.status} />
                <Badge variant="outline">
                  {CATEGORY_LABELS[listing.category]}
                </Badge>
              </div>

              <div>
                <p className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">
                  {formatListingPrice(listing)}
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {formatCurrency(pricePerSqm, listing.currency)} / m²
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <Metric
                  icon={<Maximize2 className="size-3.5" />}
                  label="Alan"
                  value={formatArea(listing.area_sqm)}
                />
                <Metric
                  icon={<Building2 className="size-3.5" />}
                  label="Oda"
                  value={formatRooms(listing.room_count)}
                />
                <Metric
                  icon={<Eye className="size-3.5" />}
                  label="Görüntülenme"
                  value={formatNumber(listing.views_count)}
                />
                <Metric
                  icon={<Heart className="size-3.5" />}
                  label="Favori"
                  value={formatNumber(listing.favorites_count)}
                />
              </div>

              <Separator />

              <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <CalendarClock className="size-3.5" />
                {formatDate(listing.created_at)} tarihinde eklendi
              </p>
            </CardContent>
          </Card>

          {agent && (
            <Card>
              <CardHeader>
                <CardTitle>Portföy danışmanı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11">
                    <AvatarFallback className="text-[13px]">
                      {agent.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-foreground">
                      {agent.full_name}
                    </p>
                    <p className="truncate text-[12.5px] text-muted-foreground">
                      {agent.title}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <ContactRow
                    icon={<Phone className="size-3.5" />}
                    href={`tel:${agent.phone.replace(/\s/g, "")}`}
                  >
                    {agent.phone}
                  </ContactRow>
                  <ContactRow
                    icon={<Mail className="size-3.5" />}
                    href={`mailto:${agent.email}`}
                  >
                    {agent.email}
                  </ContactRow>
                </div>
              </CardContent>
            </Card>
          )}

          {/* İlişkinin ters yönü: müşteri → ilan bağı burada ilan → müşteri
              olarak okunuyor (`getInterestedCustomers`). */}
          {interested.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>İlgilenen Müşteriler</CardTitle>
                <CardDescription>
                  {interested.length} kayıt bu ilanla eşleşiyor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 px-2 pt-2">
                {interested.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/musteriler/${customer.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover"
                  >
                    <CustomerAvatar
                      name={customer.full_name}
                      src={customer.avatar_url}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">
                        {customer.full_name}
                      </p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {customer.last_contact_at
                          ? `Son görüşme: ${formatShortDate(customer.last_contact_at)}`
                          : "Henüz görüşülmedi"}
                      </p>
                    </div>
                    <CustomerStatusBadge status={customer.status} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Bu ilanla ilgili randevular — en yenisi üstte.
              Durum filtresi YOK: kaç kez gezildiği, kaçının iptal olduğu
              ilanın hikâyesinin parçası (`getAppointmentsForListing`). */}
          {appointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Randevular</CardTitle>
                <CardDescription>
                  {appointments.length} kayıt bu ilana bağlı
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {appointments.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* İlana bağlı belgeler — tapu ve sözleşme genelde ilanla ilişkili.
              Randevu kartının aksine boşken de duruyor: gerekçe müşteri
              detayındaki kardeşiyle aynı. */}
          <RelatedDocuments
            documents={documents}
            filterHref={`/evraklar?listing=${listing.id}`}
          />

          <Card>
            <CardHeader>
              <CardTitle>Konum</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <p className="flex items-start gap-2 text-[13px] text-secondary-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span>
                  {listing.address}
                  <br />
                  {listing.district}, {listing.city}
                </span>
              </p>
              <ListingMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                label={`${listing.district}, ${listing.city}`}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {related.length > 0 && (
        <section className="space-y-4 pt-2">
          <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">
            {listing.district} bölgesindeki diğer ilanlar
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[14px] font-medium text-foreground">{value}</p>
    </div>
  );
}

function ContactRow({
  icon,
  href,
  children,
}: {
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-md text-[13px] text-secondary-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{children}</span>
    </a>
  );
}
