-- =============================================================================
-- EstateFlow — bir çift için tek bekleyen teklif
-- =============================================================================
-- Faz 8 sonrası düzeltme.
--
-- SORUN: aynı müşteri aynı ilana arka arkaya teklif gönderdiğinde hiçbir uyarı
-- çıkmıyordu; üç özdeş "bekliyor" satırı yan yana duruyordu. Hangisinin
-- geçerli olduğu belirsiz ve biri kabul edilince diğer ikisi ilan satıldığı
-- için "süresi doldu"ya düşüyor — kullanıcının hiç istemediği bir sonuç.
--
-- Kontrol `lib/actions/offers.ts` içine eklendi ve normal kullanımda yeterli:
-- kullanıcı anlaşılır bir mesaj görüyor. Bu indeks YARIŞ DURUMU için —
-- iki sekmede aynı anda gönderilen iki teklif uygulama kontrolünü birlikte
-- geçebilir. Aynı gerekçeyle teklif kabulünde de `status = 'pending'` koşulu
-- var; oradaki garanti veritabanı seviyesindeyken burada olmaması tutarsız
-- kalırdı.
--
-- KISMİ (partial) İNDEKS: yalnızca `pending` satırları kapsıyor. Tam bir
-- unique kısıt, bir müşterinin aynı ilana geçmişte verip reddedilen teklifini
-- de engellerdi — oysa teklif geçmişi tutulmalı ve müşteri yeniden teklif
-- verebilmeli.
--
-- Çalıştırma: Supabase Dashboard > SQL Editor. Tekrar çalıştırılabilir.
-- =============================================================================

-- Var olan çift kayıtlar indeksi engeller; en yenisi bekliyor kalır,
-- eskiler "süresi doldu"ya çekilir. Hiç çift yoksa bu ifade bir şey yapmaz.
with ranked as (
  select id,
         row_number() over (
           partition by listing_id, customer_id
           order by created_at desc, id desc
         ) as rank
  from public.offers
  where status = 'pending' and customer_id is not null
)
update public.offers
set status = 'expired'
where id in (select id from ranked where rank > 1);

create unique index if not exists offers_one_pending_per_pair
  on public.offers (listing_id, customer_id)
  where status = 'pending' and customer_id is not null;

comment on index public.offers_one_pending_per_pair is
  'Bir musteri bir ilana ayni anda tek bekleyen teklif verebilir. Gecmis teklifler (kabul/red/suresi dolmus) kapsam disi.';
