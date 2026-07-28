import Link from "next/link";
import { UserRoundSearch } from "lucide-react";

import { getCustomers } from "@/lib/data/customers";
import {
  countActiveCustomerFilters,
  parseCustomerFilters,
} from "@/lib/customers-filters";
import type { SearchParamsInput } from "@/lib/search-params";
import { formatNumber } from "@/lib/format";
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
  const customers = await getCustomers(filters);

  if (customers.length === 0) {
    const hasFilters = countActiveCustomerFilters(searchParams) > 0;

    return (
      <EmptyState
        icon={UserRoundSearch}
        badge={hasFilters ? "Sonuç yok" : "Boş liste"}
        title={
          hasFilters
            ? "Aramanızla eşleşen müşteri yok"
            : "Henüz müşteri eklenmemiş"
        }
        description={
          hasFilters
            ? "Bütçe bandını genişletmeyi veya temsilci seçimini kaldırmayı deneyin. Arama kutusu ad, telefon ve e-postada birlikte arar."
            : "Müşteri kayıtlarınız burada listelenecek; her kayıt ilgilendiği ilanlarla ve görüşme geçmişiyle birlikte tutulur."
        }
        action={
          hasFilters ? (
            <Button variant="secondary" asChild>
              <Link href="/musteriler">Filtreleri temizle</Link>
            </Button>
          ) : null
        }
        className="min-h-[380px]"
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-muted-foreground">
        <span className="font-medium text-secondary-foreground">
          {formatNumber(customers.length)}
        </span>{" "}
        müşteri listeleniyor
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {customers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </div>
  );
}
