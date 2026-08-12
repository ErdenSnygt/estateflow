-- =============================================================================
-- EstateFlow — iş notları (work_notes)
-- =============================================================================
-- Faz 18. Faz 12'de kurulan `conversations` + `messages` ikilisi KALDIRILIYOR
-- ve yerine tek bir tablo geliyor.
--
-- -----------------------------------------------------------------------------
-- NEDEN MÜŞTERİ MESAJLAŞMASI SİLİNİYOR
-- -----------------------------------------------------------------------------
-- Faz 12'nin `messages` tablosu bir danışman ↔ müşteri sohbeti modelliyordu ve
-- şemanın kendi yorum satırı sorunu zaten itiraf ediyordu:
--
--   "Müşteri tarafında gerçek bir istemci YOK (müşteriler uygulamaya
--    girmiyor); 'customer' yönü, gelen bir mesajın elle kaydedilmesi ve
--    seed verisi için."
--
-- Yani sohbetin bir tarafı hiçbir zaman var olmadı. Bir CRM'de müşteri
-- yazışması telefonda, WhatsApp'ta ve e-postada yürüyor; uygulamaya ikinci
-- bir kanal açmak, danışmanın müşteriye BURADAN yazdığında mesajın hiçbir yere
-- ulaşmadığı bir ekran demekti. Elle "gelen mesaj kaydetme" ise bir yazışma
-- kopyalama işi; kimse yapmaz.
--
-- -----------------------------------------------------------------------------
-- YERİNE NE GELİYOR
-- -----------------------------------------------------------------------------
-- Bir ofiste gerçekten uygulama içinde yürüyen iletişim EKİP İÇİ olanı:
-- "Ahmet Bey'in evrakları ne zaman gelecek", "bu müşteriyi ben üstleniyorum",
-- "fiyat konusunda esnek değil". Bunların ortak özelliği BİR KAYDA BAĞLI
-- olmaları — bir müşteriye ya da bir ilana. Bu yüzden `work_notes` bir sohbet
-- dizisi değil, KAYDA İLİŞTİRİLMİŞ NOTLAR kümesi.
--
-- Sonuç: `/mesajlar` bir gelen kutusu değil bir İŞ AKIŞI PANOSU, ve aynı veri
-- müşteri/ilan detayında da bağlam içinde görünüyor.
--
-- -----------------------------------------------------------------------------
-- ATAMA NOTU GÖRSEL DEĞİL, FONKSİYONEL
-- -----------------------------------------------------------------------------
-- `note_type = 'assignment'` bir not yazıldığında server action ilgili kaydın
-- `assigned_agent_id` / `agent_id` alanını GERÇEKTEN değiştiriyor
-- (`lib/actions/work-notes.ts`). Gerekçe: iki ayrı doğruluk kaynağı olmasın.
-- "Ahmet Bey'i ben üstleniyorum" yazan bir not, kayıt hâlâ eski danışmanı
-- gösterirken duruyorsa yalan söylüyor demektir — ve bu tam olarak Faz 12'nin
-- `messages` tablosunun düştüğü hataydı (görünen ama işlemeyen özellik).
--
-- Devir işleminin KENDİSİ veritabanı kısıtıyla ifade edilemiyor (bir satırın
-- yazılması başka bir tablodaki satırı güncellemeli); tetikleyici yerine
-- server action seçildi — `lib/actions/notify.ts` başlığındaki aynı gerekçe.
--
-- Çalıştırma: Supabase Dashboard > SQL Editor. Tekrar çalıştırılabilir.
-- =============================================================================

-- =============================================================================
-- 1. Eski tabloların kaldırılması
-- =============================================================================
-- `messages` önce `supabase_realtime` yayınından çıkarılıyor: yayında olan bir
-- tabloyu düşürmek Postgres'te çalışır ama yayın tanımı sessizce değişir ve
-- migration'ı yeniden okuyan biri tablonun neden listede olmadığını arar.
-- Açıkça çıkarmak niyeti yazılı bırakıyor.

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime drop table public.messages;
  end if;
end $$;

-- `messages` `conversations`a cascade ile bağlı; tek `drop … cascade` yeterdi
-- ama sırayı açıkça yazmak neyin gittiğini görünür kılıyor.
drop table if exists public.messages;
drop table if exists public.conversations;

-- =============================================================================
-- 2. work_notes
-- =============================================================================

create table if not exists public.work_notes (
  id                   uuid        primary key default gen_random_uuid(),

  -- --- Bağlam: EN AZ BİRİ dolu -----------------------------------------------
  -- İkisi birden dolu olabilir ("Kadıköy dairesi için Ahmet Bey'in teklifi").
  -- Hiçbiri dolu olmayan not KABUL EDİLMİYOR: bağlamsız bir not, `/mesajlar`
  -- panosunda tıklanacak hiçbir yeri olmayan bir satır olurdu ve zaten böyle
  -- bir şey yazmak isteyen kişi ekip sohbetini kastediyor demektir — bu
  -- uygulamanın işi değil.
  customer_id          text        references public.customers (id) on delete cascade,
  listing_id           text        references public.listings  (id) on delete cascade,

  author_agent_id      text        not null
                       references public.agents (id) on delete restrict,

  note_type            text        not null
                       check (note_type in ('question', 'assignment', 'note')),

  content              text        not null default '',

  -- --- @mention --------------------------------------------------------------
  -- Metindeki "@Mehmet" yalnızca GÖRÜNTÜ; asıl bağ bu kolonda. Metinden
  -- ayrıştırmaya güvenilmiyor çünkü iki "Mehmet" olabiliyor, isim
  -- değişebiliyor ve sorgulanabilir olması gerekiyor (sidebar rozeti bu
  -- kolonu sayıyor). Ayrıştırma yalnızca yazarken bir yardımcı
  -- (`lib/work-notes.ts`), saklanan gerçek kimlik.
  mentioned_agent_id   text        references public.agents (id) on delete set null,

  -- --- Durum -----------------------------------------------------------------
  -- NULL OLABİLİR ve bu bilinçli: bir "genel not"un açık/çözülmüş hâli yok.
  -- "Ahmet Bey fiyat konusunda esnek değil" notu çözülecek bir şey değil, bir
  -- bilgi. Alternatif her nota zorla bir durum vermekti; o zaman panodaki
  -- "Çözülmüş" filtresi ya bütün notları toplardı ya da hiçbirini.
  --
  -- Kısıt aşağıda: durum VARSA tür question|assignment, YOKSA note.
  status               text        check (status in ('open', 'resolved')),

  resolved_by_agent_id text        references public.agents (id) on delete set null,
  resolved_at          timestamptz,

  -- --- Yanıt zinciri ---------------------------------------------------------
  -- Bir soruya verilen cevap AYRI BİR NOT (`note_type = 'note'`), bu kolonla
  -- soruya bağlı. Ayrı bir `work_note_replies` tablosu açmak, aynı alanları
  -- (yazar, içerik, ek, zaman) ikinci kez tanımlamak olurdu — ve bir cevaba
  -- cevap verilemezdi.
  parent_note_id       uuid        references public.work_notes (id) on delete cascade,

  -- --- Ek --------------------------------------------------------------------
  -- Private `documents` bucket'ındaki NESNE YOLU (kalıcı URL değil) — gerekçe
  -- `0009_documents_storage.sql` başlığında. Bir evrak sorusuna dosya ekleyerek
  -- cevap verilebilsin diye korundu; Faz 12'deki `messages.attachment_url` ile
  -- aynı sözleşme.
  attachment_url       text,
  attachment_type      text        check (attachment_type in ('image', 'file')),

  created_at           timestamptz not null default now(),

  -- --- Kısıtlar --------------------------------------------------------------
  constraint work_notes_has_target
    check (customer_id is not null or listing_id is not null),

  constraint work_notes_not_empty
    check (length(btrim(content)) > 0 or attachment_url is not null),

  constraint work_notes_attachment_typed
    check ((attachment_url is null) = (attachment_type is null)),

  -- Durum ile tür birbirine bağlı: takip edilebilir türlerin durumu VAR,
  -- genel notun YOK. Bu kısıt olmasa "çözülmüş genel not" gibi anlamsız
  -- satırlar doğardı ve pano filtreleri onları nereye koyacağını bilemezdi.
  constraint work_notes_status_matches_type
    check ((note_type = 'note') = (status is null)),

  -- Çözüm damgası ikili: kim ve ne zaman birlikte yazılır.
  constraint work_notes_resolution_paired
    check ((resolved_at is null) = (resolved_by_agent_id is null)),

  -- 'resolved' durumu damgasız olamaz; 'open' ve NULL damgalı olamaz.
  constraint work_notes_resolution_state
    check ((status = 'resolved') = (resolved_at is not null))
);

comment on table public.work_notes is
  'Ekip ici is odakli notlar. Bir musteri VEYA ilan kaydina baglidir.
   Faz 12''deki conversations/messages ikilisinin yerini aldi — musteriyle
   yazisma bu sistemde yok, dis kanallardan yuruyor.';

comment on column public.work_notes.status is
  'question/assignment icin open|resolved; genel notta NULL (izlenecek bir
   durumu yok). Kisit: work_notes_status_matches_type.';

-- =============================================================================
-- 3. İndeksler
-- =============================================================================
-- Sorgular üç yerden geliyor: pano (`/mesajlar`), müşteri detayı, ilan detayı.
-- Üçü de "en yeni üstte" istiyor, o yüzden tarih indekslere dahil.

create index if not exists work_notes_customer_idx
  on public.work_notes (customer_id, created_at desc);

create index if not exists work_notes_listing_idx
  on public.work_notes (listing_id, created_at desc);

create index if not exists work_notes_created_idx
  on public.work_notes (created_at desc);

create index if not exists work_notes_author_idx
  on public.work_notes (author_agent_id);

-- Yanıtlar üst notlarıyla birlikte çekiliyor.
create index if not exists work_notes_parent_idx
  on public.work_notes (parent_note_id)
  where parent_note_id is not null;

-- SIDEBAR ROZETİ. "Bana yönelik açık soru/atama" sayısı bu kısmi indeksten
-- geliyor ve sorgu HER SAYFA yüklemesinde çalışıyor (layout'ta) — kısmi
-- olması önemli: çözülmüş notlar zamanla listenin ezici çoğunluğu olacak.
create index if not exists work_notes_mentioned_open_idx
  on public.work_notes (mentioned_agent_id)
  where status = 'open' and mentioned_agent_id is not null;

-- Panodaki "Açık" filtresi.
create index if not exists work_notes_open_idx
  on public.work_notes (created_at desc)
  where status = 'open';

-- =============================================================================
-- 4. RLS
-- =============================================================================
-- Kapsam DÖRT YOLDAN kuruluyor. `conversations`taki iki yollu kapsamın
-- genişletilmiş hâli, aynı gerekçeyle:
--
--   1. yönetici                     → her şey
--   2. notu yazan                   → kendi yazdığı
--   3. notta anılan (@mention)      → bana sorulan soru
--   4. bağlı kaydın sahibi          → müşterime/ilanıma yazılan not
--
-- 3 OLMASA @mention İŞLEMEZDİ: "Mehmet, bu ilanla ilgilenir misin" diye
-- sorulan Mehmet, ilan başkasının portföyündeyse notu göremezdi — yani
-- bildirim gelir, tıklayınca hiçbir şey çıkmazdı.
--
-- Fonksiyon çağrıları `(select …)` içinde: gerekçe `0005_rls_performance.sql`.
-- `owns_customer` / `owns_listing` sarmalanmıyor çünkü argüman satırdan
-- geliyor, InitPlan'a çıkarılamaz.

alter table public.work_notes enable row level security;

drop policy if exists work_notes_scoped on public.work_notes;
create policy work_notes_scoped on public.work_notes
  for all to authenticated
  using (
    (select public.is_manager())
    or author_agent_id    = (select public.current_agent_id())
    or mentioned_agent_id = (select public.current_agent_id())
    or (customer_id is not null and public.owns_customer(customer_id))
    or (listing_id  is not null and public.owns_listing(listing_id))
  )
  with check (
    (select public.is_manager())
    or author_agent_id    = (select public.current_agent_id())
    or (customer_id is not null and public.owns_customer(customer_id))
    or (listing_id  is not null and public.owns_listing(listing_id))
  );

-- `with check` içinde `mentioned_agent_id` YOK ve bu bilinçli: bir kullanıcı
-- kendini anarak istediği kaydın altına not yazamasın. Okuma tarafında ise
-- gerekli (yukarıdaki 3. yol).
--
-- ÇÖZÜMLEME BU POLİTİKANIN KAPSAMINDA: "çözüldü" işaretlemek bir UPDATE ve
-- `for all` onu da içeriyor. Yani notu görebilen herkes çözebiliyor — istenen
-- de bu: soruyu soran kişi cevabı aldığında kapatır, cevaplayan kişi de
-- kapatabilir. Kolon bazlı kısıt (yalnızca `status` değişsin) Postgres'te
-- satır politikasıyla ifade edilemiyor; `0010_settings.sql` ve
-- `0011_commission.sql` başlıklarındaki aynı sınır.

-- =============================================================================
-- 5. Bildirim türleri
-- =============================================================================
-- `message_received` artık karşılığı olmayan bir tür: mesaj yok. Yerine üç
-- yeni tür geliyor ve üçü de Faz 18'in üç olayına karşılık:
--
--   work_note_mention   → "@Mehmet bu evrakla ilgilenir misin"
--   work_note_assigned  → bir kayıt devredildi (ESKİ ve YENİ sorumluya)
--   work_note_resolved  → sorduğun soru cevaplandı
--
-- Eski türdeki satırlar SİLİNİYOR: hepsi düşürülen `conversations` tablosuna
-- işaret ediyordu, yani tıklandığında hiçbir yere gitmeyen ölü bağlar.

delete from public.notifications
where type = 'message_received'
   or related_entity_type = 'conversation';

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('customer_added', 'listing_created', 'sale_closed',
                  'appointment_scheduled',
                  'work_note_mention', 'work_note_assigned',
                  'work_note_resolved'));

alter table public.notifications
  drop constraint if exists notifications_related_entity_type_check;

alter table public.notifications
  add constraint notifications_related_entity_type_check
  check (related_entity_type in ('customer', 'listing', 'sale',
                                 'appointment', 'work_note'));

-- =============================================================================
-- 6. Bildirim tercihleri
-- =============================================================================
-- `message_received` anahtarı yerine üç yenisi. Okuma tarafı eksik anahtarı
-- "açık" sayıyor (`lib/notification-preferences.ts`), yani mevcut satırlar bu
-- güncelleme olmadan da doğru çalışırdı — ama o zaman Ayarlar sayfasındaki
-- form, veritabanında karşılığı olmayan anahtarlar gösterirdi.

alter table public.agents
  alter column notification_preferences set default
    '{"customer_added": true,
      "listing_created": true,
      "sale_closed": true,
      "appointment_scheduled": true,
      "work_note_mention": true,
      "work_note_assigned": true,
      "work_note_resolved": true}'::jsonb;

-- Mevcut satırlarda: ölü anahtarı at, yenileri ekle. `||` sağdaki değeri
-- kazandırıyor, o yüzden önce mevcut tercihler, sonra YALNIZCA eksik olanlar
-- yazılıyor — kullanıcının kapattığı bir bildirim tekrar açılmasın.
update public.agents
set notification_preferences =
  '{"work_note_mention": true,
    "work_note_assigned": true,
    "work_note_resolved": true}'::jsonb
  || (notification_preferences - 'message_received')
where notification_preferences ? 'message_received'
   or not (notification_preferences ? 'work_note_mention');

-- =============================================================================
-- 7. DEVİR — sahibinin kaydı elden çıkarabilmesi
-- =============================================================================
-- Atama notunun gerçekten çalışması için gereken izin. `customers_scoped` ve
-- `listings_scoped` (0005) hem `using` hem `with check` içinde "sahibi ben
-- olmalıyım" diyor; `with check` GÜNCELLEME SONRASI satıra bakıyor, yani bir
-- danışman kendi müşterisini başkasına devrettiğinde yeni satır kontrolü
-- geçemiyor ve UPDATE reddediliyor.
--
-- Sonuç, devri yalnızca yöneticiye bırakmaktı: bir danışman kendi müşterisini
-- izne çıkarken arkadaşına bırakamazdı. Bu, atama notunu sahadaki en yaygın
-- kullanımında işlevsiz kılardı.
--
-- Aşağıdaki politika DAR: `using` hâlâ "şu an sahibi benim" diyor, yalnızca
-- `with check` gevşiyor. Yani kimse başkasının kaydına dokunamıyor; sahibi
-- olduğu kaydı BAŞKASINA verebiliyor. Kazanılan tek yeni yetki bu — diğer
-- kolonları zaten `*_scoped` üzerinden düzenleyebiliyordu.
--
-- Politikalar PERMISSIVE, yani OR'lanıyor: `*_scoped` yerini korumaya devam
-- ediyor, bu yalnızca yanına ekleniyor.

drop policy if exists customers_handoff on public.customers;
create policy customers_handoff on public.customers
  for update to authenticated
  using (assigned_agent_id = (select public.current_agent_id()))
  with check (true);

drop policy if exists listings_handoff on public.listings;
create policy listings_handoff on public.listings
  for update to authenticated
  using (agent_id = (select public.current_agent_id()))
  with check (true);

-- DEVRALANIN AKTİF OLDUĞU BURADA DENETLENMİYOR: yabancı anahtar personelin
-- var olduğunu garantiliyor ama pasif olmadığını değil. Kontrol server
-- action'da (`lib/actions/work-notes.ts`) — pasif bir hesaba devir, kimsenin
-- göremediği bir müşteri demek olurdu.

-- =============================================================================
-- 8. Bildirim yazma — başkasının gelen kutusuna
-- =============================================================================
-- `notifications_write` (0008) "yönetici ya da kendi satırım" diyordu. Faz
-- 12'de bu yetiyordu çünkü tek çapraz bildirim, teklifi kabul eden YÖNETİCİNİN
-- ilan sahibine yazdığı satırdı.
--
-- Faz 18'de kural değişti: HERKES herkese soru sorabiliyor. "@Mehmet bu
-- evrakla ilgilenir misin" yazan bir danışman, Mehmet'in gelen kutusuna satır
-- yazamazsa bildirim hiç doğmaz — ve @mention özelliği yalnızca yöneticiler
-- için çalışan bir özellik olurdu.
--
-- GEVŞEME BİR RİSK GETİRMİYOR: bir kullanıcı zaten bir iş notu yazarak aynı
-- bildirimi doğurabiliyor; bu politika o yolu kapatmıyor, sadece doğrudan
-- yazmaya da izin veriyor. Asıl kapı uygulamada ve orada duruyor: `notify()`
-- bir server action DEĞİL (`"use server"` taşımıyor), yani istemciden
-- çağrılamıyor — gerekçesi o dosyanın başlığında.
--
-- Okuma ve güncelleme politikaları DEĞİŞMİYOR: hâlâ kimse başkasının
-- bildirimini okundu yapamıyor.

drop policy if exists notifications_write on public.notifications;
create policy notifications_write on public.notifications
  for insert to authenticated
  with check ((select public.current_agent_id()) is not null);

-- =============================================================================
-- 9. Realtime
-- =============================================================================
-- `messages` yayından çıktı (bölüm 1), yerine `work_notes` giriyor. Ölçüt
-- değişmedi ve README'de yazılı: veriyi BAŞKASI değiştiriyor ve kullanıcının
-- beklemeden öğrenmesi gerekiyor. Bir iş notu tanımı gereği başka bir
-- danışmandan geliyor — sayfayı yenileyene kadar görmemek, "sana soru
-- soruldu" rozetini işlevsiz bırakırdı.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'work_notes'
  ) then
    alter publication supabase_realtime add table public.work_notes;
  end if;
end $$;
