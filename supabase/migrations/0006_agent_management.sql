-- =============================================================================
-- EstateFlow — personel yönetimi: pasifleştirme ve denetim kaydı
-- =============================================================================
-- Faz 10. Faz 6'da Personeller modülü salt okunur bırakılmıştı ve README'ye
-- şu not düşülmüştü: "yeni personel, rol değişikliği ve prim oranı güncellemesi
-- SQL'den yapılır". Bu migration o notun veritabanı tarafını kapatıyor.
--
-- -----------------------------------------------------------------------------
-- NEDEN "SİL" DEĞİL "PASİFLEŞTİR"
-- -----------------------------------------------------------------------------
-- Bir danışmanın ilanları, müşterileri ve kapanan satışları ona bağlı. Şema
-- zaten silmeye izin vermiyor (`on delete restrict`) ve bu doğru: ayrılan bir
-- danışmanın geçmiş cirosu ofisin geçmişidir, kayıt silinince prim tabloları,
-- satış listeleri ve aktivite akışı delinir.
--
-- `is_active = false` olan personel:
--   · giriş yapabilir ama HİÇBİR VERİ GÖREMEZ (aşağıdaki fonksiyon değişikliği)
--   · listelerde "pasif" rozetiyle görünür
--   · geçmiş kayıtları olduğu gibi kalır
-- =============================================================================

-- =============================================================================
-- 1. agents.is_active
-- =============================================================================

alter table public.agents
  add column if not exists is_active boolean not null default true;

comment on column public.agents.is_active is
  'Pasif personel giris yapabilir ama hicbir veriye erisemez. Silme yerine bu kullanilir; gecmis kayitlarin butunlugu korunur.';

create index if not exists agents_is_active_idx on public.agents (is_active);

-- =============================================================================
-- 2. Oturum yardımcıları — pasif personel yetkisiz
-- =============================================================================
-- TEK NOKTADAN KESME: `current_agent_id()` pasif personel için null döndüğü an
-- 0002/0005'te yazılmış TÜM politikalar kendiliğinden kapanıyor. Sekiz tablonun
-- politikalarına tek tek `is_active` koşulu eklemeye gerek yok — hepsi zaten bu
-- fonksiyona bakıyor.

create or replace function public.current_agent_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.id from public.agents a
  where a.user_id = auth.uid() and a.is_active
  limit 1;
$$;

create or replace function public.current_agent_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.role from public.agents a
  where a.user_id = auth.uid() and a.is_active
  limit 1;
$$;

-- =============================================================================
-- 3. Kendi kaydını okuma
-- =============================================================================
-- Yukarıdaki değişikliğin yan etkisi: pasif kullanıcı KENDİ personel kaydını da
-- göremez hale gelirdi (`agents_read` politikası `id = current_agent_id()`
-- diyor, o da artık null). Arayüz o zaman "hesabınız bir personel kaydına bağlı
-- değil" derdi — yanlış teşhis, kullanıcı neden kilitlendiğini anlamazdı.
--
-- Bu ek politika kullanıcının kendi satırını her durumda okumasına izin veriyor.
-- Yalnızca OKUMA ve yalnızca KENDİ satırı; yazma hâlâ `agents_write` üzerinden
-- ve orası yönetici istiyor.
drop policy if exists agents_self_read on public.agents;
create policy agents_self_read on public.agents
  for select to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- 4. Denetim kaydı
-- =============================================================================
-- Rol ve prim değişikliği para ve yetki demek; "bunu kim ne zaman yaptı"
-- sorusunun cevabı olmalı. Tablo bilinçli olarak sade: alan adı + eski değer +
-- yeni değer, hepsi metin. JSONB tercih edilmedi çünkü bu kaydın tek tüketicisi
-- insan gözü.

create table if not exists public.agent_audit_log (
  id             uuid        primary key default gen_random_uuid(),
  -- Hakkında işlem yapılan personel.
  agent_id       text        not null references public.agents (id) on delete cascade,
  -- İşlemi yapan. Null olabilir: kayıt silinmiş bir yönetici tarafından
  -- yapılmış olabilir ve geçmiş silinmemeli.
  actor_agent_id text        references public.agents (id) on delete set null,
  action         text        not null
                 check (action in ('invited', 'profile_updated', 'role_changed',
                                   'commission_changed', 'deactivated',
                                   'reactivated')),
  field          text,
  old_value      text,
  new_value      text,
  created_at     timestamptz not null default now()
);

create index if not exists agent_audit_agent_idx
  on public.agent_audit_log (agent_id, created_at desc);

alter table public.agent_audit_log enable row level security;

-- Denetim kaydını yalnızca yöneticiler okur. YAZMA POLİTİKASI YOK ve bu
-- kasıtlı: kayıtları server action'lar servis anahtarıyla yazıyor (RLS'i
-- atlar). Böylece giriş yapmış hiçbir kullanıcı — yönetici dahil — denetim
-- kaydını elle üretemez ya da değiştiremez.
drop policy if exists agent_audit_read on public.agent_audit_log;
create policy agent_audit_read on public.agent_audit_log
  for select to authenticated
  using ((select public.is_manager()));

-- =============================================================================
-- 5. Mevcut kayıtlar
-- =============================================================================
-- Kolon `default true` ile eklendiği için mevcut altı personel aktif; ayrıca
-- bir şey yapmaya gerek yok. Doğrulama:
--   select id, full_name, role, is_active from public.agents order by id;
