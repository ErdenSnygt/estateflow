-- =============================================================================
-- EstateFlow — randevular (takvim)
-- =============================================================================
-- Faz 11. Zincirin eksik halkası: ilgi → GÖRÜŞME → teklif → satış. Müşteri
-- çizelgesinde "Ev gezildi" satırları Faz 4'ten beri duruyordu ama onları
-- üreten bir randevu kaydı yoktu; olay elle giriliyordu. Bu tablo, çizelgeye
-- düşen o satırın kaynağı.
--
-- -----------------------------------------------------------------------------
-- KARARLAR
-- -----------------------------------------------------------------------------
--  * KİMLİK UUID. `listings`/`customers` okunabilir metin kod taşıyor çünkü o
--    kodlar arayüzde gösteriliyor ("İlan no: ILN-1001"). Bir randevunun numarası
--    yok — kimse "RND-14"ten söz etmiyor. `offers`, `sales` ve çizelge olayları
--    ile aynı tarafta: uuid.
--
--  * ZAMAN timestamptz. Izgara Europe/Istanbul'a göre çiziliyor ama saklanan
--    değer mutlak an; dönüşüm tek noktada, `src/lib/calendar.ts` içinde.
--
--  * customer_id NULL OLABİLİR ama form onu ZORUNLU İSTER. Ayrım bilinçli:
--    müşteri silindiğinde randevunun kendisi kaybolmamalı (takvim geçmişi
--    bir kayıttır), bu yüzden FK `set null`. Yeni randevu açarken müşterisiz
--    kayıt üretmenin bir anlamı yok, o yüzden arayüz zorunlu tutuyor.
--
--  * listing_id GERÇEKTEN OPSİYONEL. Ofis görüşmesi ya da telefon görüşmesi
--    çoğu zaman tek bir ilana bağlı değildir.
--
--  * reminder_sent KOLONU VAR AMA HENÜZ KİMSE YAZMIYOR. Uygulamada zamanlanmış
--    iş (cron) ya da e-posta gönderimi yok; hatırlatma altyapısı geldiğinde
--    "bu randevu için bildirim gitti mi" sorusunun cevabı burada duracak.
--    Şimdilik hep `false`; arayüzde de gösterilmiyor.
--
-- Çalıştırma: Supabase Dashboard > SQL Editor. Tekrar çalıştırılabilir.
-- =============================================================================

create table if not exists public.appointments (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,

  -- Renk kodlaması bu kolondan türüyor; eşleme `src/lib/appointments.ts`.
  appointment_type text        not null default 'ev_gezme'
                   check (appointment_type in ('ev_gezme',
                                               'telefon_gorusmesi',
                                               'ofis_gorusmesi',
                                               'sozlesme_imzalama',
                                               'diger')),

  customer_id      text        references public.customers (id) on delete set null,
  listing_id       text        references public.listings  (id) on delete set null,
  -- Randevunun SAHİBİ. RLS kapsamı bu kolondan çıkıyor; `listings.agent_id` ile
  -- aynı davranış (`on delete restrict`) — üzerinde kaydı olan personel
  -- silinemez, pasifleştirilir.
  agent_id         text        not null references public.agents (id) on delete restrict,

  start_time       timestamptz not null,
  end_time         timestamptz not null,
  location         text        not null default '',
  notes            text        not null default '',

  status           text        not null default 'planlandi'
                   check (status in ('planlandi', 'tamamlandi', 'iptal')),

  reminder_sent    boolean     not null default false,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Sürükle-bırak süreyi korur ama elle düzenlemede ters aralık girilebilir;
  -- arayüz de sunucu da reddediyor, son söz burada.
  constraint appointments_time_order check (end_time > start_time)
);

comment on table public.appointments is
  'Randevular (takvim). Tamamlandi olarak isaretlenince customer_timeline_events
   tablosuna otomatik bir olay dusuyor — tetikleyici veritabaninda degil,
   lib/actions/appointments.ts icinde.';

-- Takvim sorgusunun tamamı bir TARİH ARALIĞI + sahiplik filtresi; ikisi tek
-- indekste. Danışman görünümünde `agent_id` eşitliği önce daraltıyor.
create index if not exists appointments_agent_start_idx
  on public.appointments (agent_id, start_time);

-- Yönetici görünümünde `agent_id` filtresi yok; aralık taraması yalnız kalıyor.
create index if not exists appointments_start_idx
  on public.appointments (start_time);

-- Müşteri detayındaki "Yaklaşan Randevular" ve ilan detayındaki liste.
create index if not exists appointments_customer_idx
  on public.appointments (customer_id);
create index if not exists appointments_listing_idx
  on public.appointments (listing_id);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS — mevcut rol modeliyle birebir aynı
-- =============================================================================
-- `listings_scoped` / `sales_scoped` ile aynı kalıp: yönetici hepsini görür,
-- danışman yalnızca kendi randevularını. Fonksiyon çağrıları `(select …)`
-- içinde — gerekçe `0005_rls_performance.sql` başlığında (satır başına değil,
-- sorgu başına bir kez değerlendirilsin diye).
--
-- Tek politika `for all`: bir danışmanın göremediği bir randevuyu
-- güncelleyebilmesi ya da başkasının üzerine randevu yazabilmesi için ayrı bir
-- gerekçe yok. `with check` de aynı ifade, yani sürükle-bırak ile başka birinin
-- takvimine kayıt taşınamaz.

alter table public.appointments enable row level security;

drop policy if exists appointments_scoped on public.appointments;
create policy appointments_scoped on public.appointments
  for all to authenticated
  using (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  )
  with check (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  );
