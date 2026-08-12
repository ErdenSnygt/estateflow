"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Handshake, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createOffer } from "@/lib/actions/offers";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Teklif oluşturma.
 *
 * TEK BİLEŞEN, İKİ GİRİŞ NOKTASI. İlan detayında "Teklif Al" (ilan sabit,
 * müşteri seçilir), müşteri detayında "Teklif Ver" (müşteri sabit, ilan
 * seçilir). Sabit olan taraf açılır liste yerine düz metin gösteriliyor —
 * kullanıcının zaten bulunduğu bağlamı tekrar seçtirmek gereksiz bir adım.
 *
 * İkisi de aynı `createOffer` action'ını çağırıyor: iki ayrı action olsaydı
 * iki ayrı doğrulama ve iki ayrı `agent_id` kuralı doğardı. Danışman
 * gönderilmiyor — sunucu onu ilandan okuyor.
 *
 * ÇEVİRİ: iki giriş noktası, sözlükte İKİ AYRI ANAHTAR. `listing ? a : b`
 * koşulu metnin kendisinde değil, anahtar seçiminde duruyor — "Teklif Al" ve
 * "Teklif Ver" İngilizce'de de ayrı cümleler ("Record offer" gelen teklifi
 * kaydetmek, "Place offer" verilen teklifi kaydetmek). Tek bir "New offer"
 * anahtarı Türkçe'deki bu ayrımı silerdi.
 */

type Option = { id: string; label: string; hint?: string };

export function OfferDialog({
  trigger,
  listing,
  customer,
  listingOptions,
  customerOptions,
  suggestedAmount,
}: {
  trigger?: React.ReactNode;
  /** İlan detayından açıldıysa dolu. */
  listing?: { id: string; title: string };
  /** Müşteri detayından açıldıysa dolu. */
  customer?: { id: string; full_name: string };
  /** Müşteri detayından açıldığında seçilecek ilanlar. */
  listingOptions?: Option[];
  /** İlan detayından açıldığında seçilecek müşteriler. */
  customerOptions?: Option[];
  /** Alanın başlangıç değeri — genelde ilanın liste fiyatı. */
  suggestedAmount?: number;
}) {
  const router = useRouter();
  const t = useTranslations("offers");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [amount, setAmount] = React.useState(
    suggestedAmount ? String(suggestedAmount) : "",
  );
  const [listingId, setListingId] = React.useState(listing?.id ?? "");
  const [customerId, setCustomerId] = React.useState(customer?.id ?? "");

  const options = listing ? customerOptions : listingOptions;
  const hasOptions = (options?.length ?? 0) > 0;

  function reset() {
    setIsOpen(false);
    setAmount(suggestedAmount ? String(suggestedAmount) : "");
    setListingId(listing?.id ?? "");
    setCustomerId(customer?.id ?? "");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t("invalidAmountTitle"), {
        description: t("invalidAmountBody"),
      });
      return;
    }
    if (!listingId || !customerId) {
      toast.error(t("missingTitle"), {
        description: listing ? t("missingCustomer") : t("missingListing"),
      });
      return;
    }

    setIsSaving(true);
    const result = await createOffer({ listingId, customerId, amount: value });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(t("errorTitle"), { description: result.error });
      return;
    }

    toast.success(t("successTitle"), {
      description: t("successBody", { amount: formatCurrency(value) }),
    });
    reset();
    router.refresh();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : reset())}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Handshake className="size-4" />
            {listing ? t("triggerListing") : t("triggerCustomer")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {listing ? t("titleListing") : t("titleCustomer")}
            </DialogTitle>
            <DialogDescription>
              {listing
                ? t("descriptionListing", { title: listing.title })
                : t("descriptionCustomer", { name: customer?.full_name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sabit taraf — bilgi olarak gösteriliyor, seçilmiyor. */}
            <div className="rounded-lg border border-hairline bg-surface-inset px-3 py-2.5">
              <p className="text-[11.5px] text-muted-foreground">
                {listing ? t("listingLabel") : t("customerLabel")}
              </p>
              <p className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">
                {listing ? listing.title : customer?.full_name}
              </p>
            </div>

            {/* Seçilen taraf */}
            <div className="space-y-2">
              <Label htmlFor="offer-counterpart">
                {listing ? t("counterpartCustomer") : t("counterpartListing")}
              </Label>

              {hasOptions ? (
                <Select
                  value={listing ? customerId : listingId}
                  onValueChange={listing ? setCustomerId : setListingId}
                >
                  <SelectTrigger id="offer-counterpart">
                    <SelectValue
                      placeholder={
                        listing ? t("selectCustomer") : t("selectListing")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                        {option.hint ? ` · ${option.hint}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-lg border border-dashed border-hairline-strong px-3 py-2.5 text-[12.5px] text-muted-foreground">
                  {listing ? t("noCustomers") : t("noListings")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-amount">{t("amountLabel")}</Label>
              <Input
                id="offer-amount"
                type="number"
                min={0}
                step={50000}
                inputMode="numeric"
                value={amount}
                onChange={(changed) => setAmount(changed.target.value)}
                placeholder="0"
              />
              {suggestedAmount ? (
                <p className="text-[12px] text-muted-foreground">
                  {t("listPriceHint", {
                    amount: formatCurrency(suggestedAmount),
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={reset}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSaving || !hasOptions}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
