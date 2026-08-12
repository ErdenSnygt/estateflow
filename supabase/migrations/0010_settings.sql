-- =============================================================================
-- EstateFlow — ayarlar, profil ve şirket bilgileri
-- =============================================================================
-- Faz 14. Üç ekleme: personelin kendi tercihleri, profil kapak görseli ve
-- ofis geneli şirket ayarları.
--
-- Çalıştırma: Supabase Dashboard > SQL Editor. Tekrar çalıştırılabilir.
-- =============================================================================

-- =============================================================================
-- 1. agents.notification_preferences
-- =============================================================================
-- Faz 12'de bildirimler geldi ama kapatma yolu yoktu: bir danışman kendi
-- gelen kutusunu susturamıyordu.
--
-- -----------------------------------------------------------------------------
-- NEDEN JSONB, NEDEN AYRI TABLO DEĞİL
-- -----------------------------------------------------------------------------
-- Alternatif `notification_settings (agent_id, type, enabled)` biçiminde bir
-- tabloydu. Tercihler her zaman TOPLUCA okunuyor ve TOPLUCA yazılıyor — tek
-- bir kullanıcının tek bir formu. Ayrı tablo, her bildirim yazımına bir join
-- ve her form kaydına beş upsert eklerdi; karşılığında kazanılacak şey (tek
-- bir türü SQL'den sorgulayabilmek) bu uygulamada hiç istenmiyor.
--
-- Bedeli: jsonb içindeki anahtarlar veritabanı tarafından denetlenmiyor.
-- Bu yüzden okuma tarafı ASLA ham değere güvenmiyor — `lib/notification-
-- preferences.ts` eksik/bozuk anahtarları varsayılana düşürüyor.
--
-- VARSAYILAN "HEPSİ AÇIK": yeni bir personel bildirim almaya başlar, sonra
-- istemediklerini kapatır. Tersi (hepsi kapalı) sessiz bir uygulama demekti
-- ve kimse bildirimlerin neden gelmediğini aramazdı.

alter table public.agents
  add column if not exists notification_preferences jsonb not null default
    '{"customer_added": true,
      "listing_created": true,
      "sale_closed": true,
      "message_received": true,
      "appointment_scheduled": true}'::jsonb;

comment on column public.agents.notification_preferences is
  'Bildirim turu -> acik/kapali. Anahtarlar notifications.type ile ayni.
   Eksik anahtar "acik" sayilir; cozumleme lib/notification-preferences.ts.';

-- =============================================================================
-- 2. agents.cover_url
-- =============================================================================
-- Profil sayfasındaki kapak görseli. `avatar_url` ile aynı bucket (`avatars`,
-- public) ve aynı yükleme akışı — ayrı bir bucket açmak, aynı korumaya sahip
-- iki yer yaratmak olurdu.

alter table public.agents
  add column if not exists cover_url text;

-- =============================================================================
-- 3. company_settings — TEK SATIRLIK tablo
-- =============================================================================
-- Ofisin kendisine ait ayarlar: logo, adres, vergi numarası.
--
-- -----------------------------------------------------------------------------
-- TEK SATIR NASIL GARANTİ EDİLİYOR
-- -----------------------------------------------------------------------------
-- `id` sabit bir metin ('default') ve CHECK kısıtı başka bir değeri
-- reddediyor. Böylece ikinci satır fiziksel olarak yazılamıyor ve okuma
-- tarafı "hangi satır" sorusunu hiç sormuyor.
--
-- Alternatif, uygulama tarafında "hep ilk satırı al" demekti — bir gün ikinci
-- satır yazıldığında hangisinin geçerli olduğu belirsiz kalırdı.
--
-- Çok ofisli bir kuruluma geçilirse bu tablo `offices` olur ve `agents`a bir
-- `office_id` gelir; o iş README'deki "Henüz yapılmayanlar" listesinde duruyor.

create table if not exists public.company_settings (
  id          text        primary key default 'default'
              check (id = 'default'),
  name        text        not null default '',
  logo_url    text,
  address     text        not null default '',
  tax_office  text        not null default '',
  tax_number  text        not null default '',
  phone       text        not null default '',
  email       text        not null default '',
  updated_at  timestamptz not null default now()
);

-- Satır her zaman VAR OLSUN: arayüz "kayıt yok" durumunu hiç görmesin,
-- form boş alanlarla açılsın. `on conflict do nothing` tekrar çalıştırmayı
-- güvenli kılıyor — mevcut değerleri ezmiyor.
insert into public.company_settings (id, name)
values ('default', 'EstateFlow')
on conflict (id) do nothing;

drop trigger if exists company_settings_set_updated_at on public.company_settings;
create trigger company_settings_set_updated_at
  before update on public.company_settings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. RLS
-- =============================================================================
-- OKUMA HERKESE AÇIK (oturum sahibi her personele): şirket adı ve logosu
-- ileride faturada, sözleşmede, ilan çıktısında kullanılacak bilgiler —
-- danışmanın da görmesi gerekiyor.
--
-- YAZMA YALNIZCA YÖNETİCİYE: vergi numarası ve adres ofisin resmi kimliği.
-- Arayüzde de bölüm yalnızca yöneticilere görünüyor ama asıl kapı burası.

alter table public.company_settings enable row level security;

drop policy if exists company_settings_read on public.company_settings;
create policy company_settings_read on public.company_settings
  for select to authenticated
  using ((select public.current_agent_id()) is not null);

drop policy if exists company_settings_write on public.company_settings;
create policy company_settings_write on public.company_settings
  for update to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

-- INSERT ve DELETE politikası BİLEREK YOK: satır bu migration'da açıldı ve
-- tek satır olarak kalmalı. Politikasız işlem RLS altında reddedilir.

-- =============================================================================
-- 5. agents — kendi satırını güncelleme
-- =============================================================================
-- Faz 6'daki `agents_write` politikası yalnızca YÖNETİCİYE yazma veriyordu.
-- Ayarlar sayfası bunu kırıyor: bir danışman kendi adını, telefonunu,
-- fotoğrafını ve bildirim tercihlerini değiştirebilmeli.
--
-- POLİTİKA ROL VE PRİMİ KORUMUYOR — koruyamaz da: Postgres satır seviyesinde
-- karar verir, "şu kolonlar hariç" diyemez. Kolon koruması uygulama
-- tarafında (`lib/actions/profile.ts` yalnızca izin verilen alanları yazıyor)
-- ve asıl yetki değişikliği zaten servis anahtarıyla çalışan ayrı bir
-- dosyada (`lib/auth/admin-actions.ts`).
--
-- Bu, projedeki tek "uygulama katmanı da savunma hattı" noktası ve bilinçli:
-- alternatifi, kendi telefonunu güncellemek için yöneticiye ihtiyaç duyan
-- bir personeldi.

drop policy if exists agents_self_update on public.agents;
create policy agents_self_update on public.agents
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
