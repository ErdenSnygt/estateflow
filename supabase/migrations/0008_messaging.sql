-- =============================================================================
-- EstateFlow — mesajlar, evraklar ve bildirimler
-- =============================================================================
-- Faz 12. Menüdeki son üç "yakında" ekranı: Mesajlar, Evraklar, Bildirimler.
-- Üçü birlikte çünkü ortak bir altyapı paylaşıyorlar — dosya işlemleri
-- (Storage) ve canlı güncelleme (Realtime).
--
-- -----------------------------------------------------------------------------
-- notifications ile activity_log KARIŞTIRILMAMALI
-- -----------------------------------------------------------------------------
-- İki tablo benzer görünüyor, işleri farklı:
--
--   activity_log   → OFİSİN AKIŞI. "Ne oldu" sorusunu yanıtlar, herkes aynı
--                    listeyi görür (RLS kapsamı içinde), okundu bilgisi yok,
--                    dashboard'da gösterilir. Bir olay = BİR satır.
--
--   notifications  → KİŞİSEL GELEN KUTUSU. "Benim ilgilenmem gereken ne var"
--                    sorusunu yanıtlar, her satırın bir SAHİBİ (`agent_id`) ve
--                    okundu damgası var. Aynı olay iki kişiyi ilgilendiriyorsa
--                    İKİ satır doğar.
--
-- Tek tabloya sıkıştırmak, okundu bilgisini olayın kendisine bağlamak demekti:
-- bir satış kapandığında "okundu" işaretini ilk gören herkes için kapatırdı.
--
-- Çalıştırma: Supabase Dashboard > SQL Editor. Tekrar çalıştırılabilir.
-- =============================================================================

-- =============================================================================
-- 1. conversations — müşteri başına tek yazışma dizisi
-- =============================================================================
-- MÜŞTERİ BAŞINA TEK KONUŞMA (`unique (customer_id)`). Alternatif "danışman ×
-- müşteri" ikilisiydi; o zaman müşteri başka bir danışmana devredildiğinde
-- yazışma ikiye bölünür ve yeni danışman geçmişi göremezdi. Yazışma müşterinin
-- kendisine ait; `agent_id` yalnızca "şu an kim yürütüyor" bilgisi.

create table if not exists public.conversations (
  id              uuid        primary key default gen_random_uuid(),
  customer_id     text        not null unique
                  references public.customers (id) on delete cascade,
  agent_id        text        not null
                  references public.agents (id) on delete restrict,
  -- Liste sıralaması bu kolondan; her mesaj eklendiğinde action güncelliyor.
  -- Denormalize bir alan: alternatifi her konuşma satırı için `messages`e
  -- alt sorgu atmaktı ve liste sayfası bunu satır başına yapardı.
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists conversations_agent_idx
  on public.conversations (agent_id);
create index if not exists conversations_recent_idx
  on public.conversations (last_message_at desc);

-- =============================================================================
-- 2. messages
-- =============================================================================
-- `sender_type` KİMLİK DEĞİL, YÖN bilgisi. Hangi danışmanın yazdığı ayrıca
-- tutulmuyor: konuşmanın zaten bir `agent_id`si var ve bu bir ekip sohbeti
-- değil, müşteriyle yazışma. Balonun sağda mı solda mı çizileceği bu kolondan.
--
-- Müşteri tarafında gerçek bir istemci YOK (müşteriler uygulamaya girmiyor);
-- 'customer' yönü, gelen bir mesajın elle kaydedilmesi ve seed verisi için.

create table if not exists public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null
                  references public.conversations (id) on delete cascade,
  sender_type     text        not null check (sender_type in ('agent', 'customer')),
  content         text        not null default '',

  -- Private `documents` bucket'ındaki NESNE YOLU (public URL değil) —
  -- gerekçe 0009_documents_storage.sql başlığında. Ekler de oraya gidiyor;
  -- bir müşteriye gönderilen tapu fotokopisi de en az evrak kadar hassas.
  attachment_url  text,
  attachment_type text        check (attachment_type in ('image', 'file')),

  created_at      timestamptz not null default now(),
  read_at         timestamptz,

  -- Boş mesaj yok: ya metin ya ek olmalı.
  constraint messages_not_empty
    check (length(btrim(content)) > 0 or attachment_url is not null),
  -- Ek varsa türü de olmalı; arayüz türe göre farklı çiziyor.
  constraint messages_attachment_typed
    check ((attachment_url is null) = (attachment_type is null))
);

-- Konuşma açıldığında mesajlar krono sırayla çekiliyor.
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- Okunmamış sayacı — kısmi indeks, çünkü sorgu hep `read_at is null` soruyor.
create index if not exists messages_unread_idx
  on public.messages (conversation_id)
  where read_at is null and sender_type = 'customer';

-- =============================================================================
-- 3. documents
-- =============================================================================
-- `file_url` ADI YANILTICI OLABİLİR: private bucket'ta kalıcı bir URL yok,
-- bu kolon `<uuid>.<ext>` biçiminde bir NESNE YOLU taşıyor. İndirme anında
-- imzalı URL üretiliyor (`lib/storage/signed.ts`). Kolon adı, alan adının
-- şemada `file_url` olarak istenmesinden geliyor.
--
-- `document_type` içindeki 'pdf' diğer üçüyle aynı düzlemde değil (biri biçim,
-- üçü belge cinsi); genel/sınıflandırılmamış belgelerin kovası olarak duruyor.

create table if not exists public.documents (
  id                  uuid        primary key default gen_random_uuid(),
  title               text        not null,
  document_type       text        not null default 'pdf'
                      check (document_type in ('pdf', 'tapu', 'kimlik', 'sozlesme')),

  related_customer_id text        references public.customers (id) on delete set null,
  related_listing_id  text        references public.listings  (id) on delete set null,

  file_url            text        not null,
  -- Liste satırında boyut ve ikon göstermek için; imzalı URL üretirken de
  -- content-type olarak geri veriliyor.
  file_size           bigint      not null default 0,
  mime_type           text        not null default 'application/octet-stream',

  uploaded_by         text        references public.agents (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists documents_created_idx
  on public.documents (created_at desc);
create index if not exists documents_customer_idx
  on public.documents (related_customer_id);
create index if not exists documents_listing_idx
  on public.documents (related_listing_id);
create index if not exists documents_uploader_idx
  on public.documents (uploaded_by);

-- =============================================================================
-- 4. notifications
-- =============================================================================
-- `related_entity_type` + `related_entity_id` ikilisi POLİMORFİK bir bağ:
-- yabancı anahtar YOK, çünkü hedef beş farklı tablodan biri olabiliyor.
-- Bunun bedeli, hedef silindiğinde bildirimin ölü bir bağ taşıması; arayüz
-- bunu bağlantıyı çözemediğinde sessizce düz metne düşerek karşılıyor.
-- Alternatif beş ayrı nullable FK kolonuydu — dört tanesi her satırda boş.

create table if not exists public.notifications (
  id                  uuid        primary key default gen_random_uuid(),
  -- SAHİBİ. Personel silinirse gelen kutusu da gider.
  agent_id            text        not null
                      references public.agents (id) on delete cascade,

  type                text        not null
                      check (type in ('customer_added', 'listing_created',
                                      'sale_closed', 'message_received',
                                      'appointment_scheduled')),

  title               text        not null,
  description         text        not null default '',

  related_entity_type text        check (related_entity_type in
                                    ('customer', 'listing', 'sale',
                                     'conversation', 'appointment')),
  related_entity_id   text,

  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

-- Gelen kutusu: sahibine göre, en yeni üstte.
create index if not exists notifications_agent_idx
  on public.notifications (agent_id, created_at desc);

-- Zil rozetindeki sayı — okunmamışlar kısmi indeksten geliyor.
create index if not exists notifications_unread_idx
  on public.notifications (agent_id)
  where read_at is null;

-- =============================================================================
-- 5. RLS
-- =============================================================================
-- Mevcut rol modeliyle aynı: yönetici hepsini, danışman kendininkini.
-- Fonksiyon çağrıları `(select …)` içinde — gerekçe 0005_rls_performance.sql.

-- --- conversations -----------------------------------------------------------
-- Kapsam İKİ YOLDAN kuruluyor: konuşmayı yürüten danışman ya da MÜŞTERİNİN
-- sahibi. İkincisi olmasa, müşteri başka bir danışmana devredildiğinde yeni
-- danışman müşterisini görür ama yazışmasını göremezdi.
alter table public.conversations enable row level security;

drop policy if exists conversations_scoped on public.conversations;
create policy conversations_scoped on public.conversations
  for all to authenticated
  using (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
    or public.owns_customer(customer_id)
  )
  with check (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
    or public.owns_customer(customer_id)
  );

-- --- messages ----------------------------------------------------------------
-- Mesajın kendi sahipliği yok; konuşmasından miras alıyor. `exists` alt
-- sorgusu `conversations` üzerindeki politikadan geçiyor, yani kural tek yerde.
alter table public.messages enable row level security;

drop policy if exists messages_scoped on public.messages;
create policy messages_scoped on public.messages
  for all to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
    )
  );

-- --- documents ---------------------------------------------------------------
-- Üç yoldan erişim: yükleyen, ilgili müşterinin sahibi, ilgili ilanın sahibi.
-- Hiçbirine bağlı olmayan bir belgeyi yalnızca yükleyeni ve yöneticiler görür.
alter table public.documents enable row level security;

drop policy if exists documents_scoped on public.documents;
create policy documents_scoped on public.documents
  for all to authenticated
  using (
    (select public.is_manager())
    or uploaded_by = (select public.current_agent_id())
    or (related_customer_id is not null and public.owns_customer(related_customer_id))
    or (related_listing_id  is not null and public.owns_listing(related_listing_id))
  )
  with check (
    (select public.is_manager())
    or uploaded_by = (select public.current_agent_id())
  );

-- --- notifications -----------------------------------------------------------
-- OKUMA yöneticiye de açık (rol modeline sadık kalındı) ama uygulama her
-- sorguda `agent_id = ben` filtresi koyuyor: bir patronun gelen kutusunda
-- ekibin bildirimlerinin görünmesi anlamsız olurdu. Politika izin veriyor,
-- arayüz istemiyor.
--
-- YAZMA yönetici için açık olmak ZORUNDA: bir yönetici teklifi kabul
-- ettiğinde bildirim ilanın danışmanına yazılıyor, kendisine değil.
alter table public.notifications enable row level security;

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated
  using (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  );

drop policy if exists notifications_write on public.notifications;
create policy notifications_write on public.notifications
  for insert to authenticated
  with check (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  );

-- Okundu işaretlemek bir güncelleme; yalnızca KENDİ satırında.
-- Yönetici de başkasının bildirimini okundu yapamaz — okuma hakkı var,
-- gelen kutusunu yönetme hakkı yok.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (agent_id = (select public.current_agent_id()))
  with check (agent_id = (select public.current_agent_id()));

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (agent_id = (select public.current_agent_id()));

-- =============================================================================
-- 6. Realtime
-- =============================================================================
-- YALNIZCA İKİ TABLO yayına giriyor: `messages` ve `notifications`. Gerekçe
-- README > "Realtime nerede var, nerede yok" başlığında; kısaca, canlı
-- güncellemenin gerçekten fark yarattığı iki yer bunlar. Diğer tablolar
-- (ilanlar, müşteriler, randevular) tek kullanıcının kendi eylemiyle değişiyor
-- ve `router.refresh()` zaten yeterli.
--
-- `add table` var olan tabloda hata verdiği için önce kontrol ediliyor —
-- migration tekrar çalıştırılabilir kalmalı.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
