import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Building2, CalendarClock, Phone, Wallet } from "lucide-react";

import type { CustomerListItem } from "@/lib/data/customers";
import { formatCurrencyCompact } from "@/lib/format";
import { formatDate } from "@/i18n/dates";
import { Card } from "@/components/ui/card";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";

/** Izgara görünümündeki müşteri kartı — `ListingCard` ile aynı iskelet. */
export async function CustomerCard({
  customer,
}: {
  customer: CustomerListItem;
}) {
  const [t, format] = await Promise.all([
    getTranslations("customers.card"),
    getFormatter(),
  ]);

  return (
    <Link
      href={`/musteriler/${customer.id}`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card interactive className="h-full">
        <div className="flex flex-1 flex-col gap-3.5 p-4">
          {/* --- Kimlik --- */}
          <div className="flex items-start gap-3">
            <CustomerAvatar
              name={customer.full_name}
              size={44}
            />

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14.5px] font-semibold text-foreground">
                {customer.full_name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <Phone className="size-3.5 shrink-0" />
                <span className="truncate tabular-nums">{customer.phone}</span>
              </p>
            </div>

            <CustomerStatusBadge status={customer.status} />
          </div>

          {/* --- Bütçe --- */}
          <div className="rounded-lg bg-surface-inset px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Wallet className="size-3.5" />
              {t("budgetRange")}
            </p>
            <p className="mt-0.5 text-[13.5px] font-medium tabular-nums text-foreground">
              {formatCurrencyCompact(customer.budget_min)} –{" "}
              {formatCurrencyCompact(customer.budget_max)}
            </p>
          </div>

          {/* --- Alt bilgi --- */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-hairline pt-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {t("listings", { count: customer.interest_count })}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              {customer.last_contact_at
                ? formatDate(format, customer.last_contact_at, "short")
                : t("notContacted")}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
