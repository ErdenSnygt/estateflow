import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Mail,
  Pencil,
  Phone,
  Wallet,
} from "lucide-react";

import { getCustomerById, getCustomerTimeline } from "@/lib/data/customers";
import { getUpcomingAppointmentsForCustomer } from "@/lib/data/appointments";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { CustomerTimeline } from "@/components/customers/customer-timeline";
import { AddEventForm } from "@/components/customers/add-event-form";
import { OfferDialog } from "@/components/offers/offer-dialog";
import { InterestCard } from "@/components/customers/interest-card";
import { getDocumentsForCustomer } from "@/lib/data/documents";
import { RelatedDocuments } from "@/components/documents/related-documents";
import { MessageCustomerButton } from "@/components/messages/message-customer-button";
import { AppointmentRow } from "@/components/appointments/appointment-row";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomerById(id);
  return { title: customer?.full_name ?? "Müşteri bulunamadı" };
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;

  /* Dört sorgu birbirinden bağımsız — paralel. */
  const [customer, timeline, appointments, documents] = await Promise.all([
    getCustomerById(id),
    getCustomerTimeline(id),
    getUpcomingAppointmentsForCustomer(id),
    getDocumentsForCustomer(id),
  ]);

  if (!customer) notFound();

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref="/musteriler"
        backLabel="Müşterilere dön"
        title={customer.full_name}
        description={`${customer.id.toUpperCase()} · ${formatDate(customer.created_at)} tarihinde kaydedildi`}
        actions={
          <>
            {/* İlgilendiği ilanlar arasından seçim yapılıyor; satılmış olanlar
                listeye girmiyor — sunucu da onları reddederdi. */}
            <OfferDialog
              customer={{ id: customer.id, full_name: customer.full_name }}
              listingOptions={customer.interests
                .filter((listing) => listing.status !== "satildi")
                .map((listing) => ({
                  id: listing.id,
                  label: listing.title,
                  hint: formatCurrency(listing.price, listing.currency),
                }))}
            />
            <MessageCustomerButton customerId={customer.id} />
            <Button variant="secondary" asChild>
              <a href={`tel:${customer.phone.replace(/\s/g, "")}`}>
                <Phone className="size-4" />
                Ara
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/musteriler/${customer.id}/duzenle`}>
                <Pencil className="size-4" />
                Düzenle
              </Link>
            </Button>
            <Button asChild>
              <a href={`mailto:${customer.email}`}>
                <Mail className="size-4" />
                E-posta gönder
              </a>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* --- Sol sütun --- */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          {/* Kimlik kartı */}
          <Card>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-start gap-4">
                <CustomerAvatar
                  name={customer.full_name}
                  src={customer.avatar_url}
                  size={64}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[18px] font-semibold text-foreground">
                      {customer.full_name}
                    </h2>
                    <CustomerStatusBadge status={customer.status} size="md" />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-secondary-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span className="tabular-nums">{customer.phone}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{customer.email}</span>
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Fact
                  icon={<Wallet className="size-3.5" />}
                  label="Bütçe aralığı"
                  value={`${formatCurrency(customer.budget_min)} – ${formatCurrency(customer.budget_max)}`}
                />
                <Fact
                  icon={<CalendarClock className="size-3.5" />}
                  label="Son görüşme"
                  value={
                    customer.last_contact_at
                      ? formatDate(customer.last_contact_at)
                      : "Henüz görüşülmedi"
                  }
                />
                <Fact
                  icon={<Building2 className="size-3.5" />}
                  label="İlgilendiği ilan"
                  value={`${customer.interests.length} kayıt`}
                />
              </dl>

              <div className="rounded-lg bg-surface-inset px-4 py-3">
                <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Notlar
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-secondary-foreground">
                  {customer.notes}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* İlgilendiği ilanlar */}
          <Card>
            <CardHeader>
              <CardTitle>İlgilendiği İlanlar</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {customer.interests.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Bu müşteriyle henüz bir ilan eşleştirilmemiş.
                </p>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {customer.interests.map((listing) => (
                    <InterestCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- Sağ sütun --- */}
        <div className="min-w-0 space-y-6">
          {customer.agent && (
            <Card>
              <CardHeader>
                <CardTitle>Sorumlu Danışman</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback>{customer.agent.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-foreground">
                      {customer.agent.full_name}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {customer.agent.title}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-[12.5px] text-secondary-foreground">
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 text-muted-foreground" />
                    <span className="tabular-nums">{customer.agent.phone}</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-2">
                    <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{customer.agent.email}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Yaklaşan randevular — YALNIZCA VARSA.
              Boş bir kart, sağ sütunda hiçbir şey söylemeyen bir kutu olurdu;
              randevu eklemenin yeri zaten takvim. Tamamlanan randevular
              burada değil aşağıdaki görüşme geçmişinde görünüyor. */}
          {appointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Yaklaşan Randevular</CardTitle>
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

          {/* Evrak kartı, randevu kartının aksine BOŞKEN DE duruyor: belge
              yüklemek müşteri sürecinin beklenen bir adımı ve boş kart
              "buraya tapu koyabilirsin" diyen tek yer. */}
          <RelatedDocuments
            documents={documents}
            filterHref={`/evraklar?customer=${customer.id}`}
          />

          <Card>
            <CardHeader>
              <CardTitle>Görüşme Geçmişi</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-3">
              <CustomerTimeline events={timeline} />
              <AddEventForm customerId={customer.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Fact({
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
      <dt className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-[13.5px] font-medium tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}
