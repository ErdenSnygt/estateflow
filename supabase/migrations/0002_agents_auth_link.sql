-- =============================================================================
-- EstateFlow — personel ↔ auth bağı ve rol bazlı yetkilendirme
-- =============================================================================
-- Faz 6. 0001'de RLS "giriş yapmış herkes her şeyi yapabilir" seviyesindeydi ve
-- dosyanın sonunda şu not duruyordu: "Rol bazlı ayrım ayrı bir fazda gelecek —
-- o zaman bu politikalar `agents.user_id = auth.uid()` ve rol kontrolü içeren
-- politikalarla DEĞİŞTİRİLECEK." Yapılan tam olarak bu.
--
-- Kök sorun tek cümleyle: giriş yapan kullanıcının hiçbir `agents` satırıyla
-- ilişkisi yoktu. Bu yüzden veritabanı "bu ilan kimin?" sorusunu soramıyor,
-- formda danışman elle seçiliyor ve her kullanıcı tüm portföyü görüyordu.
--
-- -----------------------------------------------------------------------------
-- İKİ AYRI "ROL" ALANI
-- -----------------------------------------------------------------------------
-- 0001'deki `agents.role` serbest metindi ve arayüzde unvan olarak görünüyordu
-- ("Kıdemli Portföy Danışmanı", "Kiralama Uzmanı"). Yetkilendirme rolü ise
-- kapalı bir küme olmak ZORUNDA — politikalar onu karşılaştırıyor. İkisi tek
-- kolona sığmaz: unvanı düzenlemek yetki değiştirmek anlamına gelirdi.
--
--   role  →  title   (görünen unvan, serbest metin, yalnızca gösterim)
--   role             (yeni: 'patron' | 'ofis_muduru' | 'danisman', RLS okur)
--
-- Çalıştırma: Supabase Dashboard > SQL Editor'a yapıştırıp Run.
-- Dosya tekrar çalıştırılabilir; ikinci çalıştırma bir şeyi bozmaz.
-- =============================================================================

-- =============================================================================
-- 1. agents — yeni kolonlar
-- =============================================================================

-- Eski `role` kolonunu unvana çevir. Yalnızca ilk çalıştırmada iş yapar.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'agents' and column_name = 'role'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'agents' and column_name = 'title'
  ) then
    alter table public.agents rename column role to title;
  end if;
end $$;

alter table public.agents
  add column if not exists title           text   not null default '',
  -- Yeni kullanıcılar en dar yetkiyle başlar; yükseltme bilinçli bir işlem.
  add column if not exists role            text   not null default 'danisman',
  add column if not exists user_id         uuid,
  -- Personel kartındaki fotoğraf. `customers.avatar_url` ile aynı sözleşme:
  -- Supabase Storage public URL'i, yoksa arayüz baş harfleri gösterir.
  add column if not exists avatar_url      text,
  -- Prim oranı. Kasıtlı olarak `numeric` DEĞİL: 0001'de para alanları için
  -- numeric'ten kaçınma gerekçesi (PostgREST serileştirmesi) burada da geçerli
  -- ve bu alan zaten para değil, bir katsayı — 0.03 ile 0.0300 arasındaki fark
  -- hiçbir yerde görünmüyor.
  add column if not exists commission_rate double precision not null default 0.02;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agents_role_check') then
    alter table public.agents add constraint agents_role_check
      check (role in ('patron', 'ofis_muduru', 'danisman'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'agents_commission_rate_check') then
    alter table public.agents add constraint agents_commission_rate_check
      check (commission_rate >= 0 and commission_rate <= 1);
  end if;

  -- Bir auth kullanıcısı en fazla bir personel kaydına bağlanabilir.
  if not exists (select 1 from pg_constraint where conname = 'agents_user_id_key') then
    alter table public.agents add constraint agents_user_id_key unique (user_id);
  end if;

  -- Kullanıcı silinirse personel kaydı ve ona bağlı portföy DURUR, yalnızca
  -- bağ kopar: `on delete cascade` olsaydı bir hesabı silmek ilanları da
  -- silerdi (agents.id → listings.agent_id zinciri üzerinden engellenirdi ama
  -- niyeti belirtmek gerekiyor).
  if not exists (select 1 from pg_constraint where conname = 'agents_user_id_fkey') then
    alter table public.agents add constraint agents_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete set null;
  end if;
end $$;

comment on column public.agents.title is
  'Gorunen unvan. Serbest metin, yalnizca gosterim.';
comment on column public.agents.role is
  'Yetkilendirme rolu: patron | ofis_muduru | danisman. RLS politikalari bunu okur.';
comment on column public.agents.commission_rate is
  'Prim orani (0-1). Prim = kapanan satis tutari * bu oran.';

-- =============================================================================
-- 2. Oturum yardımcıları
-- =============================================================================
-- Hepsi SECURITY DEFINER ve bu ZORUNLU: `agents` üzerindeki politika, giriş
-- yapanın rolünü bulmak için yine `agents` tablosunu okumak zorunda. Normal bir
-- fonksiyon bunu yaparsa politika kendi kendini çağırır ve Postgres
-- "infinite recursion detected in policy" hatası verir. SECURITY DEFINER
-- fonksiyon sahibinin haklarıyla çalışır, dolayısıyla RLS'i atlar ve döngü
-- kırılır.
--
-- `set search_path = public` de zorunlu: SECURITY DEFINER bir fonksiyonda
-- arama yolu sabitlenmezse çağıran taraf kendi şemasına sahte bir `agents`
-- tablosu koyup fonksiyonu kandırabilir.
--
-- STABLE: aynı sorgu içinde tekrar tekrar çağrılınca planlayıcı sonucu
-- önbelleğe alabilir — politikalar bunları satır başına değerlendiriyor.

create or replace function public.current_agent_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.id from public.agents a where a.user_id = auth.uid() limit 1;
$$;

create or replace function public.current_agent_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.role from public.agents a where a.user_id = auth.uid() limit 1;
$$;

/*
  Ofis müdürü şu an patronla AYNI kapsamı görüyor.

  Sebep: veri modelinde henüz ofis/ekip diye bir şey yok — ne `offices`
  tablosu var ne de `agents.office_id`. "Kendi ofisinin her şeyi" ifadesini
  bugün doğru hesaplayacak bir alan bulunmadığı için uydurulmuş bir kapsam
  yerine bilinen bir kapsam veriliyor.

  Ayrıştırma noktası tek ve bu fonksiyon: `agents.office_id` eklendiğinde
  `is_manager()` ikiye bölünür —

    is_owner()        -> current_agent_role() = 'patron'
    same_office(x)    -> current_agent_role() = 'ofis_muduru'
                         and x = current_agent_office()

  ve politikalardaki `is_manager()` çağrıları
  `is_owner() or same_office(agent_id)` biçimini alır. Tablo politikalarının
  geri kalanı aynen kalır.
*/
create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_agent_role() in ('patron', 'ofis_muduru'), false);
$$;

-- İlişki tablolarının politikaları "bu müşteri/ilan benim mi?" diye soruyor.
-- Doğrudan `exists (select 1 from customers …)` yazılamaz: o alt sorgu da RLS'e
-- takılır ve sahibi olmadığımız ama ilişkili olduğumuz satırlar görünmez olur.
create or replace function public.owns_customer(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.customers c
    where c.id = target and c.assigned_agent_id = public.current_agent_id()
  );
$$;

create or replace function public.owns_listing(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id = target and l.agent_id = public.current_agent_id()
  );
$$;

-- =============================================================================
-- 3. Demo org şeması + test kullanıcısının bağlanması
-- =============================================================================

-- Demo ekibinde her rolden en az bir kişi olsun: rol farklarının etkisi ancak
-- böyle görünür hale geliyor. Unvanlar da rolle uyumlu hale getiriliyor —
-- "Kıdemli Portföy Danışmanı" unvanlı bir patron kafa karıştırırdı.
--
-- AYNI DAĞILIM `scripts/seed-supabase.ts` içinde de tanımlı. İki yerde
-- durmasının sebebi iki farklı giriş noktası olması: şemayı bu dosya kurar,
-- veriyi seed yazar ve `npm run seed` tabloyu tamamen siler. Biri diğerini
-- geçersiz kılmıyor, ikisi de aynı sonuca varıyor.
update public.agents set role = 'patron',      title = 'Kurucu Ortak',      commission_rate = 0.035 where id = 'agt-1';
update public.agents set role = 'ofis_muduru', title = 'Ofis Müdürü',       commission_rate = 0.030 where id = 'agt-2';
update public.agents set role = 'danisman',    commission_rate = 0.025 where id in ('agt-3', 'agt-6');
update public.agents set role = 'danisman',    commission_rate = 0.020 where id in ('agt-4', 'agt-5');

-- Test kullanıcısı → agt-1 (patron).
--
-- Yeni bir personel kaydı AÇILMIYOR, mevcut olanla eşleştiriliyor: sıfır ilanı
-- ve sıfır müşterisi olan bir hesapla giriş yapmak demoyu boş gösterirdi. Aynı
-- eşleştirmeyi seed script'i de yapıyor, dolayısıyla `npm run seed` sonrası bağ
-- kendiliğinden geri kurulur.
--
-- Tablo boşsa (migration seed'den önce çalıştıysa) bu blok bir şey bulamaz ve
-- uyarı basar — sonraki `npm run seed` bağı kurar.
do $$
declare
  uid   uuid;
  umail text := 'erden@test.com';
begin
  select u.id into uid from auth.users u where lower(u.email) = umail limit 1;

  if uid is null then
    raise notice 'Kullanici % bulunamadi. Dashboard > Authentication > Users altindan olusturup bu dosyayi tekrar calistirin.', umail;
    return;
  end if;

  if not exists (select 1 from public.agents where id = 'agt-1') then
    raise notice 'agt-1 kaydi yok (tablo bos olabilir). "npm run seed" calistirin; bag orada kurulacak.';
    return;
  end if;

  update public.agents set user_id = uid, email = umail where id = 'agt-1';
  raise notice 'agt-1 -> % (patron) baglandi.', umail;
end $$;

-- =============================================================================
-- 4. Rol bazlı RLS politikaları
-- =============================================================================
-- 0001'deki tek "authenticated her şeyi yapabilir" politikası her tablodan
-- kaldırılıyor ve yerine kapsamlı olanlar geliyor.
--
-- ORTAK KURAL: yönetici (patron / ofis müdürü) her şeyi görür ve düzenler;
-- danışman yalnızca KENDİ kaydına dokunur — ilanlarda `agent_id`, müşterilerde
-- `assigned_agent_id` üzerinden.
--
-- BAĞLANMAMIŞ KULLANICI HİÇBİR ŞEY GÖRMEZ: `current_agent_id()` null döner,
-- `x = null` sonucu null, null da politika için "hayır" demektir. Yani sisteme
-- kaydolmuş ama personel kaydına bağlanmamış biri boş bir uygulama görür —
-- kasıtlı. Arayüz bu durumu ayrıca uyarı olarak gösteriyor (`app-shell`).
--
-- `for all` kullanımı: `using` hangi satırlara DOKUNULABİLECEĞİNİ,
-- `with check` yazılan satırın NE OLABİLECEĞİNİ sınırlar. İkisi birlikte,
-- bir danışmanın kendi ilanını başka bir danışmana devretmesini de engeller.

do $$
declare
  target text;
begin
  foreach target in array array[
    'agents', 'listings', 'customers', 'customer_listing_interests',
    'customer_timeline_events', 'activity_log', 'sales', 'offers'
  ]
  loop
    execute format('drop policy if exists %I on public.%I',
                   target || '_authenticated_all', target);
  end loop;
end $$;

-- --- agents ------------------------------------------------------------------
-- Danışman kendi kaydını GÖRÜR (formda adının çıkması, profil kartı) ama
-- düzenleyemez — kendi rolünü yükseltmek en açık yetki kaçışı olurdu.
drop policy if exists agents_read on public.agents;
create policy agents_read on public.agents
  for select to authenticated
  using (public.is_manager() or id = public.current_agent_id());

drop policy if exists agents_write on public.agents;
create policy agents_write on public.agents
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- --- listings ----------------------------------------------------------------
drop policy if exists listings_scoped on public.listings;
create policy listings_scoped on public.listings
  for all to authenticated
  using      (public.is_manager() or agent_id = public.current_agent_id())
  with check (public.is_manager() or agent_id = public.current_agent_id());

-- --- customers ---------------------------------------------------------------
drop policy if exists customers_scoped on public.customers;
create policy customers_scoped on public.customers
  for all to authenticated
  using      (public.is_manager() or assigned_agent_id = public.current_agent_id())
  with check (public.is_manager() or assigned_agent_id = public.current_agent_id());

-- --- customer_listing_interests ----------------------------------------------
-- İki yönlü: ilişki, müşterinin sahibine de ilanın sahibine de görünür.
-- Tek yön seçilseydi ilan detayındaki "İlgilenen Müşteriler" kartı, ilan sizin
-- olsa bile başkasının müşterisi orada görünmediği için boş kalırdı.
drop policy if exists interests_scoped on public.customer_listing_interests;
create policy interests_scoped on public.customer_listing_interests
  for all to authenticated
  using (
    public.is_manager()
    or public.owns_customer(customer_id)
    or public.owns_listing(listing_id)
  )
  with check (
    public.is_manager()
    or public.owns_customer(customer_id)
    or public.owns_listing(listing_id)
  );

-- --- customer_timeline_events ------------------------------------------------
drop policy if exists timeline_scoped on public.customer_timeline_events;
create policy timeline_scoped on public.customer_timeline_events
  for all to authenticated
  using      (public.is_manager() or public.owns_customer(customer_id))
  with check (public.is_manager() or public.owns_customer(customer_id));

-- --- activity_log ------------------------------------------------------------
-- Danışmanın dashboard akışı kendi işini gösterir: ya olayın aktörü odur ya da
-- olay onun portföyündeki bir kayda bağlıdır.
drop policy if exists activity_scoped on public.activity_log;
create policy activity_scoped on public.activity_log
  for all to authenticated
  using (
    public.is_manager()
    or actor_agent_id = public.current_agent_id()
    or (related_listing_id  is not null and public.owns_listing(related_listing_id))
    or (related_customer_id is not null and public.owns_customer(related_customer_id))
  )
  with check (
    public.is_manager()
    or actor_agent_id = public.current_agent_id()
  );

-- --- sales -------------------------------------------------------------------
drop policy if exists sales_scoped on public.sales;
create policy sales_scoped on public.sales
  for all to authenticated
  using      (public.is_manager() or agent_id = public.current_agent_id())
  with check (public.is_manager() or agent_id = public.current_agent_id());

-- --- offers ------------------------------------------------------------------
drop policy if exists offers_scoped on public.offers;
create policy offers_scoped on public.offers
  for all to authenticated
  using      (public.is_manager() or agent_id = public.current_agent_id())
  with check (public.is_manager() or agent_id = public.current_agent_id());

-- =============================================================================
-- 5. Index
-- =============================================================================
-- `current_agent_id()` her politika değerlendirmesinde bu aramayı yapıyor.
create index if not exists agents_user_id_idx on public.agents (user_id);
create index if not exists agents_role_idx    on public.agents (role);
