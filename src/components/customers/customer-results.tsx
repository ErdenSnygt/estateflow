import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRoundSearch } from "lucide-react";

import { getCustomers } from "@/lib/data/customers";
import {
  countActiveCustomerFilters,
  parseCustomerFilters,
} from "@/lib/customers-filters";
import type { SearchParamsInput } from "@/lib/search-params";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { CustomerCard } from "@/components/customers/customer-card";

/** `ListingResults` ile aynı sözleşme: async, Suspense içinde çağrılır. */
export async function CustomerResults({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}) {
  const filters = parseCustomerFilters(searchParams);
  const [customers, t] = await Promise.all([
    getCustomers(filters),
    getTranslations("customers.list"),
  ]);

  if (customers.length === 0) {
    const hasFilters = countActiveCustomerFilters(searchParams) > 0;

    return (
      <EmptyState
        icon={UserRoundSearch}
        badge={t(hasFilters ? "noResultBadge" : "emptyBadge")}
        title={t(hasFilters ? "noResultTitle" : "emptyTitle")}
        description={t(hasFilters ? "noResultDescription" : "emptyDescription")}
        action={
          hasFilters ? (
            <Button variant="secondary" asChild>
              <Link href="/musteriler">{t("clearFilters")}</Link>
            </Button>
          ) : null
        }
        className="min-h-[380px]"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Sayı cümlenin İÇİNDE: Türkçede sonda ("… müşteri listeleniyor"),
          İngilizcede başta ("3 customers listed"). Vurgulu yazım `<b>` ile
          metinde, `t.rich` onu elemana çeviriyor. */}
      <p className="text-[12.5px] text-muted-foreground">
        {t.rich("count", {
          count: customers.length,
          b: (chunks) => (
            <span className="font-medium text-secondary-foreground">
              {chunks}
            </span>
          ),
        })}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {customers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </div>
  );
}
