-- =============================================================================
-- Emlak CRM — komisyon tahsilat durumu
-- =============================================================================
-- Faz 16. Gelirler modülü, Satışlar'dan FARKLI BİR SORUYU yanıtlıyor:
--
--   Satışlar  → "hangi işlemler kapandı"   (olay listesi)
--   Gelirler  → "komisyonum tahsil edildi mi" (para akışı)
--
-- Aynı `sales` satırı iki soruya da kaynak; ikinci soru için eksik olan tek
-- şey tahsilat durumuydu.
--
-- -----------------------------------------------------------------------------
-- NEDEN AYRI BİR `commissions` TABLOSU DEĞİL
-- -----------------------------------------------------------------------------
-- Komisyon, satışla BİRE BİR: her kapanan işlem tam bir komisyon üretiyor,
-- tutarı da `sales.amount × agents.commission_rate` ile türetiliyor. Ayrı
-- tablo, her satış eklendiğinde ikinci bir satır yazmayı ve ikisinin senkron
-- kalmasını sağlamayı gerektirirdi — kazancı ise yok, çünkü bir satışın iki
-- komisyonu olmuyor.
--
-- Bu değişirse (ör. alıcı ve satıcı tarafına ayrı komisyon, ya da kısmi
-- tahsilat) ayrı tablo şart olur. O gün geldiğinde bu kolon `commissions`
-- tablosunun `status` alanına taşınır.
--
-- -----------------------------------------------------------------------------
-- TUTAR NEDEN SAKLANMIYOR
-- -----------------------------------------------------------------------------
-- `commission_amount` diye bir kolon YOK ve bu bilinçli: tutar
-- `amount × commission_rate` çarpımı, yani türetilebilir. Saklamak, prim oranı
-- değiştiğinde geçmiş kayıtların ne olacağı sorusunu doğururdu.
--
-- Bunun bir bedeli var ve kabul ediliyor: prim oranı BUGÜNKÜ oran üzerinden
-- hesaplanıyor, satışın kapandığı andaki oran üzerinden değil. Gerçek bir
-- muhasebe sisteminde oran satır bazında dondurulurdu; burada ofis tek ve
-- oranlar nadiren değişiyor. README'de yazılı.
--
-- Çalıştırma: Supabase Dashboard > SQL Editor. Tekrar çalıştırılabilir.
-- =============================================================================

alter table public.sales
  add column if not exists commission_status text not null default 'pending'
    check (commission_status in ('pending', 'collected', 'overdue'));

comment on column public.sales.commission_status is
  'Komisyon tahsilat durumu. overdue bir KULLANICI SECIMI degil, tarihten
   turetilen bir durum degil — yonetici elle isaretler. Otomatik gecikme
   hesabi icin vade tarihi kolonu gerekirdi (bkz. 0011 basligi).';

-- Gelirler sayfası hem duruma hem tarihe göre filtreliyor.
create index if not exists sales_commission_status_idx
  on public.sales (commission_status);

-- Danışman bazlı döküm: sahiplik + tarih birlikte taranıyor.
create index if not exists sales_agent_closed_idx
  on public.sales (agent_id, closed_at desc);

-- =============================================================================
-- RLS
-- =============================================================================
-- YENİ POLİTİKA GEREKMİYOR. `sales_scoped` (0005) `for all` kapsamında ve
-- zaten "yönetici hepsini, danışman kendi satışlarını" diyor. Tahsilat
-- işaretleme bir UPDATE ve aynı politikadan geçiyor.
--
-- Ama bu, bir DANIŞMANIN KENDİ komisyonunu "tahsil edildi" işaretleyebilmesi
-- demek — istenen bu değil. Kısıt uygulama tarafında: `markCommissionCollected`
-- ilk satırında rol kontrolü yapıyor (`lib/actions/revenue.ts`).
--
-- Kolon bazlı kısıt Postgres'te satır politikasıyla ifade edilemiyor; aynı
-- durumun bir örneği daha `0010_settings.sql` içinde (`agents_self_update`)
-- ve orada da gerekçesi yazılı.
