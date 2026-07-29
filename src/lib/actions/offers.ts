"use server";

import { revalidatePath } from "next/cache";

import type { OfferStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { canTransition, closesSale } from "@/lib/offers";
import { formatCurrency } from "@/lib/format";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";
import { getCurrentAgent } from "@/lib/auth/server";
import { notify } from "@/lib/actions/notify";

/**
 * ============================================================================
 * TEKLİF YAZMA İŞLEMLERİ
 * ============================================================================
 * Zincirin son halkası: ilgi → görüşme → TEKLİF → SATIŞ. Faz 8'e kadar
 * `offers` ve `sales` tablolarına yalnızca seed yazıyordu; dashboard'ın
 * "Bu Ay Satış" ve "Bekleyen Teklif" kartları gerçek tabloları okuyor ama o
 * tablolara arayüzden tek satır eklenemiyordu.
 *
 * -----------------------------------------------------------------------------
 * PRİM KARARI: `agent_id` HER ZAMAN İLANIN SAHİBİNDEN GELİR
 * -----------------------------------------------------------------------------
 * Ne teklifte ne satışta danışman elle seçilmiyor; ikisi de
 * `listings.agent_id`'den okunuyor. "Kim kapattı" ayrı bir kavram olarak
 * TUTULMUYOR — prim her zaman portföy sahibine gider. Böylece bir teklifi
 * yöneticinin kapatması primi ondan almıyor, ilanı takip eden danışmanda
 * bırakıyor. Gerekçe README > "Satışlar ve teklifler".
 */

function revalidateSales(listingId?: string, customerId?: string) {
  revalidatePath("/satislar");
  revalidatePath("/satislar/teklifler");
  revalidatePath("/dashboard");
  revalidatePath("/personeller");
  if (listingId) revalidatePath(`/ilanlar/${listingId}`);
  if (customerId) revalidatePath(`/musteriler/${customerId}`);
}

/* ==========================================================================
   Teklif oluşturma
   ========================================================================== */

/**
 * Yeni teklif.
 *
 * İlan detayındaki "Teklif Al" ve müşteri detayındaki "Teklif Ver" AYNI
 * fonksiyonu çağırır; tek fark hangi alanın önceden dolu geldiği. İki ayrı
 * action olsaydı iki ayrı doğrulama ve iki ayrı `agent_id` kuralı doğardı.
 */
export async function createOffer(input: {
  listingId: string;
  customerId: string;
  amount: number;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return fail("Teklif tutarı 0'dan büyük olmalıdır.");
  }

  /* İlan okunuyor çünkü `agent_id` oradan geliyor — istemciden gelen bir
     danışman kimliğine güvenilmiyor. Okuma RLS'e tabi: kullanıcı göremediği
     bir ilana teklif oluşturamaz. */
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, title, agent_id, status")
    .eq("id", input.listingId)
    .maybeSingle();

  if (listingError) return fail(toMessage(listingError));
  if (!listing) return fail("İlan bulunamadı.");
  if (listing.status === "satildi") {
    return fail("Bu ilan satılmış; yeni teklif alınamaz.");
  }

  /* AYNI ÇİFTE İKİNCİ BEKLEYEN TEKLİF YOK.
     Bir müşterinin aynı ilana aynı anda iki açık teklifi olamaz — hangisinin
     geçerli olduğu belirsiz kalır ve kabul edildiğinde hangisinin tutarıyla
     satış kapanacağı da öyle. Müşteri teklifini yükseltmek isterse önce
     eskisi kapatılır; bu bir tıklama ve mesajda söyleniyor.

     Sessizce eski teklifi kapatmak seçilmedi: kullanıcının istemediği bir
     veri değişikliği, hata mesajından daha kötüdür. */
  const { data: existing } = await supabase
    .from("offers")
    .select("id, amount")
    .eq("listing_id", listing.id)
    .eq("customer_id", input.customerId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return fail(
      `Bu müşterinin bu ilana ${formatCurrency(existing.amount)} tutarında bekleyen bir teklifi zaten var. Yeni teklif için önce Teklifler sayfasından eskisini yanıtlayın ya da "süresi doldu" olarak işaretleyin.`,
    );
  }

  const amount = Math.round(input.amount);

  const { data, error } = await supabase
    .from("offers")
    .insert({
      listing_id: listing.id,
      customer_id: input.customerId,
      agent_id: listing.agent_id,
      amount,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    /* Yukarıdaki kontrolü yarış durumunda geçen ikinci istek buraya düşer:
       kısmi unique indeks (`0004_offers_unique_pending.sql`) reddeder.
       Genel "benzersiz alan çakışması" mesajı yerine gerçek nedeni söylüyoruz. */
    if (error.code === "23505") {
      return fail(
        "Bu müşterinin bu ilana bekleyen bir teklifi zaten var. Sayfayı yenileyin.",
      );
    }
    return fail(toMessage(error));
  }

  await supabase.from("activity_log").insert({
    event_type: "offer_received",
    description: input.listingId.toUpperCase(),
    amount,
    actor_agent_id: listing.agent_id,
    related_listing_id: listing.id,
    related_customer_id: input.customerId,
  });

  /* Teklif müşterinin GÖRÜŞME GEÇMİŞİNE de düşer.
     Çizelgede `offer_sent` olay tipi baştan beri vardı ve seed onu
     kullanıyordu; teklif arayüzden oluşturulunca da aynı satırın çıkması
     gerekiyor, yoksa çizelge gerçeğin yarısını gösterir. */
  await supabase.from("customer_timeline_events").insert({
    customer_id: input.customerId,
    event_type: "offer_sent",
    description: `${listing.title} · ${formatCurrency(amount)}`,
    listing_id: listing.id,
  });

  /* Teklif vermek bir müşteri temasıdır — liste sayfasındaki "son görüşme"
     sütunu ve varsayılan sıralama bu alandan besleniyor. */
  await supabase
    .from("customers")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", input.customerId);

  revalidateSales(listing.id, input.customerId);
  revalidatePath("/musteriler");
  return ok({ id: data.id });
}

/* ==========================================================================
   Durum geçişi
   ========================================================================== */

/**
 * Teklif durumunu değiştirir; kabul edilmesi halinde satışı da kapatır.
 *
 * -----------------------------------------------------------------------------
 * NEDEN TEK AKSİYON
 * -----------------------------------------------------------------------------
 * "Kabul et" bir kullanıcı için tek bir karardır; arkasındaki dört yazma
 * (teklif durumu, satış satırı, ilanın `satildi` olması, aktivite kaydı) bir
 * uygulama detayıdır. Arayüzde dört adım olsaydı her adım yarıda kalabilirdi
 * ve "kabul edilmiş ama satılmamış ilan" gibi tutarsız durumlar ekranda
 * görünürdü. Kullanıcı kararı verir, gerisi burada yürür.
 *
 * TAM ATOMİK DEĞİL: PostgREST üzerinden çok tablolu transaction açılamıyor.
 * Sıralama en kritik yazma önce olacak şekilde seçildi — teklif durumu
 * `pending`ten çıkmazsa hiçbir yan etki başlamaz, yani çift kabul mümkün
 * değil. Sonraki adımlardan biri düşerse teklif kabul edilmiş ama satış
 * yazılmamış olur; bu, tersinin (satış var, teklif hâlâ bekliyor) aksine
 * kullanıcıya görünür ve elle düzeltilebilir bir durum.
 */
export async function updateOfferStatus(
  offerId: string,
  next: OfferStatus,
): Promise<ActionResult<{ id: string; saleCreated: boolean }>> {
  const supabase = await createClient();

  const { data: offer, error: readError } = await supabase
    .from("offers")
    .select("id, status, amount, listing_id, customer_id")
    .eq("id", offerId)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!offer) return fail("Teklif bulunamadı.");

  /* Geçiş kuralı saf bir fonksiyonda (`lib/offers.ts`) ve arayüz de aynı
     kaynağa bakıyor — düğmeler ile sunucu aynı şeyi söylesin. */
  const check = canTransition(offer.status, next);
  if (!check.ok) return fail(check.reason);

  /* İLK YAZMA VE KAPI: koşula `status = 'pending'` ekli. Aynı teklif iki
     sekmede birden kabul edilirse ikincisi hiçbir satır güncelleyemez ve
     aşağıdaki yan etkiler hiç başlamaz. */
  const { data: updated, error: updateError } = await supabase
    .from("offers")
    .update({ status: next })
    .eq("id", offerId)
    .eq("status", "pending")
    .select("id");

  if (updateError) return fail(toMessage(updateError));
  if (!updated || updated.length === 0) {
    return fail("Teklifin durumu bu sırada değişmiş; sayfayı yenileyin.");
  }

  if (!closesSale(next)) {
    revalidateSales(offer.listing_id, offer.customer_id ?? undefined);
    return ok({ id: offerId, saleCreated: false });
  }

  /* --- Kabul: satışı kapat --------------------------------------------- */

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, agent_id")
    .eq("id", offer.listing_id)
    .maybeSingle();

  /* PRİM KARARI BURADA UYGULANIYOR: `agent_id` ilandan, tutar teklifden. */
  const agentId = listing?.agent_id ?? null;

  const { error: saleError } = await supabase.from("sales").insert({
    listing_id: offer.listing_id,
    customer_id: offer.customer_id,
    agent_id: agentId,
    amount: offer.amount,
    closed_at: new Date().toISOString(),
  });

  if (saleError) {
    return fail(
      `Teklif kabul edildi ama satış kaydı oluşturulamadı: ${toMessage(saleError)}`,
    );
  }

  await supabase
    .from("listings")
    .update({ status: "satildi" })
    .eq("id", offer.listing_id);

  /* Aynı ilana verilmiş DİĞER bekleyen teklifler artık yanıtsız kalamaz:
     ilan satıldı. Süresi dolmuş sayılıyorlar — reddedilmediler, konusuz
     kaldılar. */
  await supabase
    .from("offers")
    .update({ status: "expired" })
    .eq("listing_id", offer.listing_id)
    .eq("status", "pending");

  await supabase.from("activity_log").insert({
    event_type: "sale_closed",
    description: listing?.title ?? offer.listing_id.toUpperCase(),
    amount: offer.amount,
    actor_agent_id: agentId,
    related_listing_id: offer.listing_id,
    related_customer_id: offer.customer_id,
  });

  /* Satış müşterinin geçmişine de düşsün — çizelge "satın alma tamamlandı"
     satırını gösterir. */
  if (offer.customer_id) {
    await supabase.from("customer_timeline_events").insert({
      customer_id: offer.customer_id,
      event_type: "purchased",
      description: listing?.title ?? offer.listing_id.toUpperCase(),
      listing_id: offer.listing_id,
    });
  }

  /* SATIŞ BİLDİRİMİ İLANIN DANIŞMANINA. Prim kararıyla aynı mantık: teklifi
     kim kapatırsa kapatsın satış portföy sahibinin, dolayısıyla haber de
     onun. Kendi teklifini kabul eden danışman bildirim almıyor — `notify()`
     aktörle hedef aynıysa atlıyor. */
  const actor = await getCurrentAgent();
  await notify(supabase, {
    agentId,
    actorAgentId: actor?.id,
    type: "sale_closed",
    title: "İlanınız satıldı",
    description: `${listing?.title ?? offer.listing_id.toUpperCase()} · ${formatCurrency(offer.amount)}`,
    entityType: "sale",
    entityId: offer.listing_id,
  });

  revalidateSales(offer.listing_id, offer.customer_id ?? undefined);
  revalidatePath("/ilanlar");
  return ok({ id: offerId, saleCreated: true });
}
