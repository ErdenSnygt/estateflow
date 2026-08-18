-- =============================================================================
-- 0013 — DEMO ROLÜ: HER ŞEYİ GÖRÜR, HİÇBİR ŞEY YAZAMAZ
-- =============================================================================
-- Portföy/tanıtım amaçlı, herkese açık bir hesap. Uygulamanın dolu hâlini
-- göstermesi gerekiyor, dolayısıyla görünürlüğü patron kadar geniş; ama
-- ziyaretçinin veriyi bozamaması gerekiyor, dolayısıyla yazma yetkisi SIFIR.
--
-- -----------------------------------------------------------------------------
-- NEDEN MEVCUT POLİTİKALARA HİÇ DOKUNULMUYOR
-- -----------------------------------------------------------------------------
-- İlk akla gelen çözüm `is_manager()` fonksiyonunu "veya demo" diye genişletmek
-- olurdu. YANLIŞ OLURDU: politikaların çoğu `for all` ve `is_manager()` hem
-- `using` (okuma) hem `with check` (yazma) tarafında geçiyor. Fonksiyonu
-- genişletmek demoya yazma yetkisi de verirdi.
--
-- Bunun yerine, her tabloya AYRI ve YALNIZCA SELECT olan bir politika
-- ekleniyor. Postgres'te aynı tabloda birden çok "permissive" politika VEYA ile
-- birleşir; yani:
--
--   · patron / ofis_muduru / danisman  → davranışları bit bit aynı kalıyor,
--     eklenen politikanın `using` koşulu onlar için `false` dönüyor.
--   · demo → yeni SELECT politikasından okuma hakkı kazanıyor.
--   · demo'nun INSERT/UPDATE/DELETE'i → HİÇBİR politika onu kapsamıyor ve
--     RLS'in varsayılanı REDDETMEK. Yani "yasakla" diye bir kural yazmıyoruz,
--     sadece "izin ver" diye bir kural YAZMIYORUZ. Unutulan bir tablo demoya
--     yazma değil, okuma bile vermez — hata güvenli tarafa düşüyor.
--
-- İki katmanın ikincisi uygulamada: `lib/actions/guard.ts` her server action'ın
-- başında demoyu durduruyor ve kullanıcıya ne olduğunu söyleyen bir mesaj
-- dönüyor. RLS olmasa arayüz kandırılabilirdi; arayüz olmasa kullanıcı sessizce
-- başarısız olan düğmelere bakardı. İkisi farklı işler yapıyor.
--
-- Idempotent: tekrar çalıştırmak zarar vermez.
-- =============================================================================

-- =============================================================================
-- 1. Enum'a yeni değer
-- =============================================================================
-- `agents.role` gerçek bir Postgres enum'u değil, `text` + CHECK kısıtı
-- (0002'deki tercih; enum'a değer eklemek geri alınamaz bir işlem). Kısıtı
-- düşürüp yeniden kuruyoruz.

alter table public.agents drop constraint if exists agents_role_check;

alter table public.agents add constraint agents_role_check
  check (role in ('patron', 'ofis_muduru', 'danisman', 'demo'));

comment on column public.agents.role is
  'Yetki rolü: patron | ofis_muduru | danisman | demo. '
  '`demo` salt okunur bir tanıtım hesabıdır — okuması patron kadar geniş, '
  'yazma politikası hiç yok. Görünen unvan için `title` kolonuna bakın.';

-- =============================================================================
-- 2. `is_demo()` — politikaların okuduğu tek soru
-- =============================================================================
-- `is_manager()` ile aynı kalıpta: `security definer` ve sabit `search_path`.
-- `coalesce` şart — `current_agent_role()` bağlanmamış kullanıcıda null döner
-- ve null bir politika için "hayır" demek olsa da, açıkça `false` döndürmek
-- fonksiyonu başka bir ifadenin içine koyduğumuzda sürprizi engelliyor.

create or replace function public.is_demo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_agent_role() = 'demo', false);
$$;

comment on function public.is_demo() is
  'Giriş yapan kullanıcı salt okunur demo hesabı mı. Yalnızca SELECT '
  'politikalarında kullanılır; hiçbir yazma politikasında geçmemelidir.';

-- =============================================================================
-- 3. Salt okuma politikaları
-- =============================================================================
-- Hepsi aynı: `for select`, koşul yalnızca `is_demo()`. Satır filtresi YOK —
-- demonun bütün portföyü görmesi zaten amaç.
--
-- `to authenticated`: anonim ziyaretçi hiçbir şey görmez. Demo hesabı da
-- gerçek bir Supabase Auth kullanıcısı, yani giriş yapmadan bu politikalar
-- devreye girmiyor.

-- --- Portföy ----------------------------------------------------------------

drop policy if exists listings_demo_read on public.listings;
create policy listings_demo_read on public.listings
  for select to authenticated
  using ((select public.is_demo()));

drop policy if exists customers_demo_read on public.customers;
create policy customers_demo_read on public.customers
  for select to authenticated
  using ((select public.is_demo()));

drop policy if exists interests_demo_read on public.customer_listing_interests;
create policy interests_demo_read on public.customer_listing_interests
  for select to authenticated
  using ((select public.is_demo()));

drop policy if exists timeline_demo_read on public.customer_timeline_events;
create policy timeline_demo_read on public.customer_timeline_events
  for select to authenticated
  using ((select public.is_demo()));

drop policy if exists appointments_demo_read on public.appointments;
create policy appointments_demo_read on public.appointments
  for select to authenticated
  using ((select public.is_demo()));

-- --- Satış ve finans --------------------------------------------------------

drop policy if exists sales_demo_read on public.sales;
create policy sales_demo_read on public.sales
  for select to authenticated
  using ((select public.is_demo()));

drop policy if exists offers_demo_read on public.offers;
create policy offers_demo_read on public.offers
  for select to authenticated
  using ((select public.is_demo()));

-- --- İş akışı ---------------------------------------------------------------

drop policy if exists work_notes_demo_read on public.work_notes;
create policy work_notes_demo_read on public.work_notes
  for select to authenticated
  using ((select public.is_demo()));

drop policy if exists documents_demo_read on public.documents;
create policy documents_demo_read on public.documents
  for select to authenticated
  using ((select public.is_demo()));

drop policy if exists activity_demo_read on public.activity_log;
create policy activity_demo_read on public.activity_log
  for select to authenticated
  using ((select public.is_demo()));

-- BİLDİRİMLER — KASITLI OLARAK HEPSİ.
-- Diğer roller için `notifications_read` politikası kişiseldir
-- (`agent_id = current_agent_id()`). Demo hesabının kendi bildirimi hiç
-- olmayacağı için o kural ona boş bir zil bırakırdı; tanıtım hesabında boş bir
-- modül, çalışmıyor sanılır. Bu satırlar seed verisi, gerçek kişilere ait bir
-- yazışma değil.
drop policy if exists notifications_demo_read on public.notifications;
create policy notifications_demo_read on public.notifications
  for select to authenticated
  using ((select public.is_demo()));

-- --- Ekip ve ayarlar --------------------------------------------------------

drop policy if exists agents_demo_read on public.agents;
create policy agents_demo_read on public.agents
  for select to authenticated
  using ((select public.is_demo()));

drop policy if exists company_settings_demo_read on public.company_settings;
create policy company_settings_demo_read on public.company_settings
  for select to authenticated
  using ((select public.is_demo()));

-- `agent_audit_log` BİLEREK DIŞARIDA. Rol ve prim değişikliklerinin izi
-- arayüzde hiçbir yerde çizilmiyor (yalnızca `admin-actions.ts` yazıyor),
-- dolayısıyla demonun onu görmesi ne bir şey gösterir ne de gerekir. Politika
-- yazılmadığı için okuma da kapalı.

-- =============================================================================
-- 4. Storage — evrak önizleme ve indirme
-- =============================================================================
-- `documents` bucket'ı private; imzalı URL üretmek için `storage.objects`
-- üzerinde SELECT hakkı gerekiyor (gerekçe 0009'da). Demo evrak listesini
-- görebilmeli ve bir belgeyi açabilmeli.
--
-- INSERT/DELETE politikası YOK: demo dosya yükleyemez, silemez.
--
-- `listings` ve `avatars` bucket'ları public, onlar için politika gerekmiyor.

drop policy if exists emlak_documents_demo_read on storage.objects;
create policy emlak_documents_demo_read on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (select public.is_demo()));

-- -----------------------------------------------------------------------------
-- BURASI BİR AÇIĞI KAPATIYOR — "sadece politika ekle" kuralının tek istisnası
-- -----------------------------------------------------------------------------
-- Yukarıdaki her şey yeni politika EKLEYEREK çalışıyor, çünkü izin vermeyen
-- bir kural yazmamak yeterli. Storage'da durum tersineydi: 0003 ve 0009'daki
-- yükleme politikaları "giriş yapmış ve bir personel kaydına bağlı HERKES"
-- diyordu. Demo hesabı da bağlı bir personel — yani dosya yükleyebiliyordu.
--
-- Bu, RLS'in okuma/yazma ayrımının atladığı bir yoldu: yükleme kutuları
-- (`image-dropzone`, `document-dropzone`, `avatar-upload`) server action'dan
-- GEÇMİYOR, tarayıcıdan doğrudan Storage'a XHR atıyor. Yani `denyIfReadOnly()`
-- muhafızı da devreye girmiyordu. Herkese açık bir hesapla herkese açık bir
-- bucket'a dosya yüklenebilmesi, tanıtım hesabını bedava dosya barındırma
-- servisine çevirirdi.
--
-- Güncelleme ve silme zaten kapalıydı (`owner = auth.uid() or is_manager()`;
-- demo yönetici değil ve hiçbir nesnenin sahibi değil) — ama yükleyebilseydi
-- kendi yüklediğinin sahibi olur ve o kapı da açılırdı. Yüklemeyi kapatmak
-- zincirin tamamını kapatıyor.
--
-- MEVCUT ROLLERİN DAVRANIŞI DEĞİŞMİYOR: `is_demo()` onlar için `false`,
-- dolayısıyla `and not ...` koşulu hep doğru. Politikaların geri kalanı
-- 0003/0009'daki hâliyle birebir aynı.

drop policy if exists emlak_storage_insert on storage.objects;
create policy emlak_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('listings', 'avatars')
    and public.current_agent_id() is not null
    and not (select public.is_demo())
  );

drop policy if exists emlak_documents_insert on storage.objects;
create policy emlak_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.current_agent_id() is not null
    and not (select public.is_demo())
  );

-- =============================================================================
-- 5. Demoya AÇIK KALMIŞ İKİ YAZMA YOLU
-- =============================================================================
-- Bölüm 3 "izin veren kural yazmıyoruz" ilkesiyle çalışıyor ve tablo
-- politikalarının çoğunda bu yetiyor: hepsi ya `is_manager()` ya da
-- `x = current_agent_id()` soruyor, demo ikisini de geçemiyor.
--
-- İKİ POLİTİKA BU KALIBIN DIŞINDAYDI ve doğrulama turunda yakalandı. İkisi de
-- 0013'ün getirdiği hata değil; daha önceden duruyorlardı ve o zamanki
-- gerekçeleri de doğruydu. Değişen şey, artık ŞİFRESİ HERKESE AÇIK bir hesabın
-- bu politikaları sağlıyor olması — "içeriden güven" varsayımı internetteki
-- herkes için geçerli değil.
--
-- Düzeltme deseni depolamadakiyle aynı: politika birebir korunuyor, sonuna tek
-- bir `and not is_demo()` ekleniyor. `is_demo()` diğer roller için `false`
-- döndüğü için patron / ofis_muduru / danisman davranışı BİT BİT AYNI kalıyor.

-- -----------------------------------------------------------------------------
-- 5a. `agents_self_update` — yetki yükseltme yolu
-- -----------------------------------------------------------------------------
-- 0010'daki hâli:
--
--   using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))
--
-- RLS satır düzeyinde çalışır, KOLON düzeyinde değil. Yani bu politika "kendi
-- satırına dokunabilirsin" derken hangi kolonlara dokunulduğunu sormuyor ve
-- `agents` tablosunda `role`, `commission_rate`, `is_active`, `user_id` var.
-- Demo hesabı, uygulamayı hiç kullanmadan, kendi oturum jetonuyla doğrudan
-- PostgREST'e şunu atabiliyordu:
--
--   PATCH /rest/v1/agents?id=eq.agt-demo   {"role": "patron"}
--
-- İstek politikayı geçerdi ve o andan sonra bütün `is_manager()` politikaları
-- demoya açılırdı — okuma DA yazma DA. Uygulama katmanı bunu göremez, çünkü
-- istek uygulamadan geçmiyor.
--
-- ÇÖZÜM DEMOYU BU POLİTİKADAN TAMAMEN ÇIKARMAK. Kolon bazlı bir kısıt
-- (`grant update (…) on agents`) da mümkündü ama gereksiz: demo zaten salt
-- okunur, kendi profilini düzenlemesi de istenmiyor. Tek koşul, hem yetki
-- yükseltmeyi hem profil düzenlemeyi birlikte kapatıyor.
--
-- Demonun `agents` üzerinde başka bir UPDATE yolu YOK: `agents_write`
-- politikası `is_manager()` istiyor ve demo yönetici değil. Bu satırdan sonra
-- demo bu tabloya hiçbir şey yazamıyor.
--
-- SERVİS ANAHTARI ETKİLENMİYOR: personel yönetimi (`lib/auth/admin-actions.ts`)
-- `createAdminClient()` kullanıyor ve servis rolü RLS'i tamamen baypas eder.
-- Rol/prim/pasifleştirme akışları aynen çalışmaya devam ediyor.

drop policy if exists agents_self_update on public.agents;
create policy agents_self_update on public.agents
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and not (select public.is_demo())
  )
  with check (
    user_id = (select auth.uid())
    and not (select public.is_demo())
  );

-- -----------------------------------------------------------------------------
-- 5b. `notifications_write` — serbest bildirim yazma yolu
-- -----------------------------------------------------------------------------
-- 0012'deki hâli:
--
--   with check ((select public.current_agent_id()) is not null)
--
-- Kapsam yok, tek soru "bir personel kaydına bağlı mısın". Demo bağlı — yani
-- istediği `agent_id`'ye istediği bildirimi ekleyebiliyordu.
--
-- 0012 bu gevşemeyi şöyle gerekçelendirmişti: "bir kullanıcı zaten bir iş notu
-- yazarak aynı bildirimi doğurabiliyor, bu politika yeni bir kapı açmıyor."
-- Gerekçe kendi bağlamında DOĞRUYDU ama demo için geçerli değil: demo iş notu
-- yazamıyor, dolayısıyla burası onun TEK bildirim yazma yolu.
--
-- Diğer roller için koşul birebir aynı kaldı.

drop policy if exists notifications_write on public.notifications;
create policy notifications_write on public.notifications
  for insert to authenticated
  with check (
    (select public.current_agent_id()) is not null
    and not (select public.is_demo())
  );

-- -----------------------------------------------------------------------------
-- KAPSAM DIŞI KALAN, BİLİNEN BİR KONU
-- -----------------------------------------------------------------------------
-- `agents_self_update` kolon kısıtı taşımadığı için GERÇEK BİR DANIŞMAN da
-- kendi rolünü `patron` yapabilir. Bu, demo rolünden bağımsız ve ondan önce
-- var olan bir durum; 0010 bunu "projedeki tek 'uygulama katmanı da savunma
-- hattı' noktası" diye zaten kabul etmişti.
--
-- Bu migration onu KAPATMIYOR — kapsamı demo hesabı. Kapatmak isteyen için yol
-- kolon bazlı yetki (RLS'in üstüne biner, servis anahtarını etkilemez):
--
--   revoke update on public.agents from authenticated;
--   grant  update (full_name, initials, title, phone,
--                  avatar_url, cover_url, notification_preferences)
--     on public.agents to authenticated;
--
-- Uygulamanın oturumla yazdığı kolonlar tam olarak bunlar
-- (`lib/actions/profile.ts`), yani ayrı bir uyarlama gerekmez.

-- =============================================================================
-- 6. Demo personel kaydı
-- =============================================================================
-- ŞİFRE BU DOSYADA YOK ve olmamalı: migration'lar sürüm kontrolünde duruyor.
-- Auth kullanıcısı Supabase Dashboard > Authentication > Users altından elle
-- açılıyor; 0002'deki test kullanıcısı deseniyle birebir aynı yol.
--
-- Kayıt YENİ AÇILIYOR (0002'deki gibi mevcut bir personele bağlanmıyor):
-- demo hesabının kendi ilanı ya da müşterisi olmamalı. Görüşü politikadan
-- geliyor, sahipliğinden değil — `agt-demo` üzerine hiçbir satır yazılmıyor.
--
-- `is_active` true olmak zorunda: `current_agent_id()` pasif kayda null döner
-- ve o durumda demo hiçbir şey göremez.

insert into public.agents (id, full_name, initials, title, role, email, commission_rate, is_active)
values (
  'agt-demo',
  'Demo Kullanıcı',
  'DK',
  'Salt Okunur Erişim',
  'demo',
  'demo@estateflow.app',
  0,
  true
)
on conflict (id) do update
  set role      = 'demo',
      email     = 'demo@estateflow.app',
      is_active = true;

-- Auth kullanıcısı varsa bağla. Yoksa uyarı basıp geçiyor: kullanıcı panelden
-- açıldıktan sonra bu dosyayı tekrar çalıştırmak yeterli.
do $$
declare
  uid   uuid;
  umail text := 'demo@estateflow.app';
begin
  select u.id into uid from auth.users u where lower(u.email) = umail limit 1;

  if uid is null then
    raise notice 'Demo kullanicisi (%) bulunamadi. Dashboard > Authentication > Users altindan olusturup bu dosyayi tekrar calistirin.', umail;
    return;
  end if;

  update public.agents set user_id = uid where id = 'agt-demo';
  raise notice 'agt-demo -> % (demo, salt okunur) baglandi.', umail;
end $$;

-- =============================================================================
-- 7. Doğrulama sorguları (elle çalıştırmak için)
-- =============================================================================
-- 1) Demoya İZİN VEREN her politika SELECT olmalı. Boş dönmelidir:
--
--   select tablename, policyname, cmd
--   from pg_policies
--   where schemaname = 'public'
--     and qual like '%is_demo%'
--     and qual not like '%not %is_demo%'
--     and cmd <> 'SELECT';
--
-- 2) Demoyu KAPATAN dört politika yerinde mi? Dört satır dönmelidir
--    (agents_self_update, notifications_write, emlak_storage_insert,
--    emlak_documents_insert):
--
--   select schemaname, tablename, policyname, cmd
--   from pg_policies
--   where coalesce(qual, '') || coalesce(with_check, '') like '%not %is_demo%';
--
-- 3) Uçtan uca: demo oturumuyla aşağıdaki iki istek 403 dönmelidir.
--
--   curl -X PATCH "$SUPABASE_URL/rest/v1/agents?id=eq.agt-demo" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $DEMO_JWT" \
--     -H "Content-Type: application/json" -d '{"role":"patron"}'
--
--   curl -X POST "$SUPABASE_URL/rest/v1/notifications" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $DEMO_JWT" \
--     -H "Content-Type: application/json" \
--     -d '{"agent_id":"agt-1","type":"sale_closed","title":"test"}'
