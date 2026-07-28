-- =============================================================================
-- Emlak CRM — başlangıç şeması
-- =============================================================================
-- Faz 5: mock veri katmanından Supabase'e geçiş.
--
-- Tasarım kararları:
--
--  * BİRİNCİL ANAHTARLAR METİN. `iln-1001`, `mst-2001`, `agt-1` gibi okunabilir
--    kodlar arayüzde gösteriliyor ("İlan no: ILN-1001") ve URL'lerde duruyor.
--    uuid'e geçmek demoyu görünür biçimde fakirleştirirdi. Yeni kayıtlar için
--    aynı biçimi üreten iki dizi (sequence) tanımlı; kod üretimi veritabanında
--    kalır, uygulama tarafında id kurgulanmaz.
--
--  * PARA ALANLARI BIGINT. `numeric` PostgREST üzerinden bazı durumlarda metin
--    olarak serileşiyor; tutarların hepsi tam TL olduğu için bigint hem güvenli
--    hem de JSON'da doğrudan sayı.
--
--  * ENUM YERİNE CHECK. Şema hâlâ oturuyor; `alter type … add value` işlemi
--    transaction içinde kısıtlı, check kısıtını değiştirmek ise serbest.
--
--  * `sales` ve `offers` tabloları Faz 5 briefinde sayılmıyordu; dashboard'ın
--    "Bu Ay Satış" ve "Bekleyen Teklif" kartları olmadan sabit mock sayılara
--    geri düşerdi. Ayrıntı için README > "Tablo ↔ fonksiyon eşlemesi".
--
-- Çalıştırma: Supabase Dashboard > SQL Editor'a yapıştırıp Run. Ardından
-- `npm run seed`.
-- =============================================================================

-- =============================================================================
-- 0. Ortak yardımcılar
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'updated_at kolonunu her guncellemede tazeler; uygulama bu alani gondermez.';

-- Yeni kayıtların kodu mevcut demo aralığının ÜSTÜNDEN başlar; seed script
-- sabit kimliklerle yazdığı için diziler onlarla çakışmaz.
create sequence if not exists public.listing_id_seq  start with 1101;
create sequence if not exists public.customer_id_seq start with 2101;

-- =============================================================================
-- 1. agents — ofis danışmanları
-- =============================================================================

create table if not exists public.agents (
  id          text primary key,
  full_name   text not null,
  initials    text not null,
  role        text not null,
  email       text not null unique,
  phone       text not null default '',
  created_at  timestamptz not null default now()
);

comment on table public.agents is
  'Personel/temsilci. İlanlar ve müşteriler buraya bağlanır. Supabase Auth
   kullanıcılarıyla eşleme (agents.user_id) rol bazlı yetkilendirme fazında
   eklenecek.';

-- =============================================================================
-- 2. listings — ilan portföyü
-- =============================================================================

create table if not exists public.listings (
  id              text primary key
                  default ('iln-' || nextval('public.listing_id_seq')),
  title           text        not null,
  description     text        not null default '',
  price           bigint      not null check (price >= 0),
  currency        text        not null default 'TRY'
                  check (currency in ('TRY', 'USD', 'EUR')),
  area_sqm        integer     not null check (area_sqm >= 0),
  -- 0 = konut dışı (arsa, ofis). "3+1" gösterimi uygulamada türetilir.
  room_count      integer     not null default 0 check (room_count >= 0),
  category        text        not null
                  check (category in ('satilik', 'kiralik', 'arsa', 'villa', 'ofis')),
  status          text        not null default 'taslak'
                  check (status in ('aktif', 'pasif', 'taslak', 'satildi')),
  city            text        not null,
  district        text        not null,
  address         text        not null default '',
  -- Formda harita seçici yok; elle girilen ilanlarda boş kalabilir.
  latitude        double precision,
  longitude       double precision,
  -- Supabase Storage public URL listesi. İlk görsel kapak kabul edilir.
  images          text[]      not null default '{}',
  views_count     integer     not null default 0,
  favorites_count integer     not null default 0,
  -- Taslak ilanlarda null.
  published_at    timestamptz,
  agent_id        text        not null references public.agents (id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Liste sayfasının filtreleri: şehir/ilçe birlikte, kategori ve durum tek tek.
create index if not exists listings_city_district_idx on public.listings (city, district);
create index if not exists listings_category_idx      on public.listings (category);
create index if not exists listings_status_idx        on public.listings (status);
create index if not exists listings_agent_idx         on public.listings (agent_id);
-- Varsayılan sıralama ("En yeni") ve KPI trend pencereleri.
create index if not exists listings_created_at_idx    on public.listings (created_at desc);
create index if not exists listings_price_idx         on public.listings (price);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3. customers — müşteri kayıtları
-- =============================================================================

create table if not exists public.customers (
  id                text primary key
                    default ('mst-' || nextval('public.customer_id_seq')),
  full_name         text        not null,
  phone             text        not null default '',
  email             text        not null default '',
  -- Supabase Storage public URL'i; yoksa arayüz baş harfleri gösterir.
  avatar_url        text,
  budget_min        bigint      not null default 0 check (budget_min >= 0),
  budget_max        bigint      not null default 0 check (budget_max >= 0),
  status            text        not null default 'normal'
                    check (status in ('sicak', 'normal', 'soguk')),
  assigned_agent_id text        not null references public.agents (id) on delete restrict,
  notes             text        not null default '',
  -- Hiç görüşülmediyse null.
  last_contact_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint customers_budget_range check (budget_max >= budget_min)
);

create index if not exists customers_status_idx       on public.customers (status);
create index if not exists customers_agent_idx        on public.customers (assigned_agent_id);
-- Varsayılan sıralama: son görüşmeye göre.
create index if not exists customers_last_contact_idx on public.customers (last_contact_at desc nulls last);
create index if not exists customers_created_at_idx   on public.customers (created_at desc);
-- Bütçe filtresi aralık kesişimi arıyor; iki uç da taranıyor.
create index if not exists customers_budget_idx       on public.customers (budget_min, budget_max);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. customer_listing_interests — müşteri ↔ ilan (çoka-çok)
-- =============================================================================

create table if not exists public.customer_listing_interests (
  customer_id text        not null references public.customers (id) on delete cascade,
  listing_id  text        not null references public.listings  (id) on delete cascade,
  -- `intent` olmadan kiralık ilanlar hiçbir müşteriyle eşleşemiyordu: bütçe
  -- alanları bir SATIN ALMA bütçesi ve aylık kira onunla kıyaslanınca
  -- "₺24 Mn bütçeli alıcı ₺178 B/ay daireyle ilgileniyor" gibi tutarsız
  -- satırlar çıkıyordu. Niyet artık ilişkinin kendisinde duruyor.
  intent      text        not null default 'purchase'
              check (intent in ('purchase', 'rent')),
  created_at  timestamptz not null default now(),

  primary key (customer_id, listing_id)
);

-- Birincil anahtar customer_id ile başladığı için o yön zaten indeksli;
-- ters yön (ilan detayındaki "İlgilenen Müşteriler") ayrıca gerekiyor.
create index if not exists interests_listing_idx on public.customer_listing_interests (listing_id);

-- =============================================================================
-- 5. customer_timeline_events — görüşme geçmişi
-- =============================================================================

create table if not exists public.customer_timeline_events (
  id          uuid        primary key default gen_random_uuid(),
  customer_id text        not null references public.customers (id) on delete cascade,
  event_type  text        not null
              check (event_type in ('created', 'called', 'viewed',
                                    'offer_sent', 'negotiation',
                                    'purchased', 'lost')),
  description text        not null default '',
  -- İlgili ilan — her olayda olmayabilir (ör. kayıt oluşturuldu).
  listing_id  text        references public.listings (id) on delete set null,
  -- Olayın gerçekleştiği an; `created_at` satırın yazıldığı an.
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists timeline_customer_idx on public.customer_timeline_events (customer_id, occurred_at);

-- =============================================================================
-- 6. activity_log — dashboard aktivite akışı
-- =============================================================================

create table if not exists public.activity_log (
  id                  uuid        primary key default gen_random_uuid(),
  event_type          text        not null
                      check (event_type in ('listing_created', 'sale_closed',
                                            'offer_received', 'customer_added',
                                            'appointment_scheduled')),
  -- Kısa özne: ilan başlığı ya da müşteri adı. Cümlenin fiilini arayüz kurar
  -- ("… portföye eklendi"), böylece metin dili arayüzde tek yerde durur.
  description         text        not null,
  -- Satış / teklif tutarı (TRY); diğer olaylarda null.
  amount              bigint,
  actor_agent_id      text        references public.agents    (id) on delete set null,
  related_listing_id  text        references public.listings  (id) on delete cascade,
  related_customer_id text        references public.customers (id) on delete cascade,
  created_at          timestamptz not null default now()
);

create index if not exists activity_created_at_idx on public.activity_log (created_at desc);

-- =============================================================================
-- 7. sales — kapanan işlemler   (brief'te sayılmayan ek tablo)
-- =============================================================================
-- Dashboard'ın 12 aylık satış grafiği ve "Bu Ay Satış" kartı Faz 3'te bağımsız
-- bir mock seriydi. Bu tablo olmasa seri ya kodda sabit kalırdı (fazın
-- "hiçbir mock veri kalmasın" kuralına aykırı) ya da `listings.status =
-- 'satildi'` üzerinden türetilirdi — 46 kayıtta 6 satış, 12 aylık bir grafiği
-- taşımaz. Kapanan işlem zaten ilandan ayrı bir olgu: aynı ilan yıllar içinde
-- birden çok kez el değiştirebilir.

create table if not exists public.sales (
  id          uuid        primary key default gen_random_uuid(),
  listing_id  text        references public.listings  (id) on delete set null,
  customer_id text        references public.customers (id) on delete set null,
  agent_id    text        references public.agents    (id) on delete set null,
  amount      bigint      not null check (amount >= 0),
  closed_at   timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Aylık gruplama (`date_trunc('month', closed_at)`) bu indeksi kullanır.
create index if not exists sales_closed_at_idx on public.sales (closed_at desc);
create index if not exists sales_agent_idx     on public.sales (agent_id);

-- =============================================================================
-- 8. offers — teklifler   (brief'te sayılmayan ek tablo)
-- =============================================================================
-- "Bekleyen Teklif" KPI'ı Faz 3'te `MOCK_PENDING_OFFERS = 14` sabitiydi ve
-- trendi uydurmaydı. Aktivite akışında zaten `offer_received` olayı var;
-- teklifi kaydetmeden o olayın arkasında bir olgu yok.

create table if not exists public.offers (
  id          uuid        primary key default gen_random_uuid(),
  listing_id  text        not null references public.listings  (id) on delete cascade,
  customer_id text        references public.customers (id) on delete set null,
  agent_id    text        references public.agents    (id) on delete set null,
  amount      bigint      not null check (amount >= 0),
  status      text        not null default 'pending'
              check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists offers_status_created_idx on public.offers (status, created_at desc);
create index if not exists offers_listing_idx        on public.offers (listing_id);

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 9. Row Level Security
-- =============================================================================
-- ŞİMDİLİK BASİT: giriş yapmış (authenticated) herkes her tabloyu okur ve
-- yazar. Rol bazlı ayrım (Patron / Ofis Müdürü / Danışman) ayrı bir fazda,
-- auth tam oturduktan sonra gelecek — o zaman bu politikalar
-- `agents.user_id = auth.uid()` ve rol kontrolü içeren politikalarla
-- DEĞİŞTİRİLECEK.
--
-- Kritik nokta: `anon` rolüne hiçbir politika verilmiyor. RLS açık ve politika
-- yoksa erişim reddedilir; yani giriş yapmamış bir ziyaretçi publishable
-- anahtarla veriye ulaşamaz.

alter table public.agents                    enable row level security;
alter table public.listings                  enable row level security;
alter table public.customers                 enable row level security;
alter table public.customer_listing_interests enable row level security;
alter table public.customer_timeline_events  enable row level security;
alter table public.activity_log              enable row level security;
alter table public.sales                     enable row level security;
alter table public.offers                    enable row level security;

do $$
declare
  target text;
begin
  foreach target in array array[
    'agents', 'listings', 'customers', 'customer_listing_interests',
    'customer_timeline_events', 'activity_log', 'sales', 'offers'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      target || '_authenticated_all', target
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      target || '_authenticated_all', target
    );
  end loop;
end;
$$;
