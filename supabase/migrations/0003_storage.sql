-- =============================================================================
-- Emlak CRM — Supabase Storage: bucket'lar ve politikalar
-- =============================================================================
-- Faz 7. Buraya kadar fotoğraf yükleme sahteydi: `image-dropzone` seçilen
-- dosyayı `URL.createObjectURL()` ile `blob:http://localhost:3000/…` adresine
-- çeviriyor, form da bunu `listings.images` kolonuna YAZIYORDU. Blob adresi
-- sekmeye bağlı; sekme kapanınca ölüyor. Yani formdan eklenen her ilanın
-- görselleri kalıcı olarak kırıktı.
--
-- -----------------------------------------------------------------------------
-- İKİ BUCKET, İKİSİ DE PUBLIC
-- -----------------------------------------------------------------------------
-- `listings` (ilan fotoğrafları) ve `avatars` (müşteri + personel portreleri).
-- Private bucket + imzalı URL yolu bilinçle seçilmedi; gerekçe README'de.
-- Kısaca: imzalı URL her okumada sunucu tarafında bir imzalama adımı ve süre
-- dolunca yenilenme mantığı ister, bu proje ise bir portföy demosu.
--
-- -----------------------------------------------------------------------------
-- BOYUT VE TİP SINIRI BUCKET SEVİYESİNDE
-- -----------------------------------------------------------------------------
-- İstemci tarafında da kontrol var (anlaşılır hata mesajı için) ama ASIL SINIR
-- burası: istemci kontrolü atlatılabilir, bucket sınırı atlatılamaz. Telefon
-- fotoğrafları 5-12 MB aralığında; 8 MB sınırı sıkıştırma sonrası fazlasıyla
-- yeterli, sıkıştırmayı atlayan bir istemci için de makul bir tavan.
-- =============================================================================

-- =============================================================================
-- 1. Bucket'lar
-- =============================================================================
-- Dashboard'dan da açılabilirdi ama migration olarak duruyor: bucket adı ve
-- sınırları uygulamanın davranışını belirliyor, sürüm kontrolünde olmalı.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listings', 'listings', true, 8388608,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars',  'avatars',  true, 8388608,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- 2. storage.objects politikaları
-- =============================================================================
-- `storage.objects` ayrı bir tablo ve 0002'deki politikalar oraya uygulanmıyor.
-- Yardımcı fonksiyonlar ise yeniden kullanılıyor — rol modeli tek yerde kalsın.
--
-- -----------------------------------------------------------------------------
-- SAHİPLİK NEDEN `owner` ÜZERİNDEN, "ilişkili ilan" ÜZERİNDEN DEĞİL
-- -----------------------------------------------------------------------------
-- Dosya yolu şeması düz: `<bucket>/<uuid>.<ext>`. Klasör hiyerarşisi yok, çünkü
-- dosya İLAN KAYDI DAHA VAR OLMADAN yükleniyor — ilan kimliği (`iln-1102`)
-- veritabanındaki dizinden INSERT anında geliyor, formda daha bilinmiyor.
--
-- Bunun doğrudan sonucu: bir Storage nesnesinin hangi ilana ait olduğu
-- POLİTİKA SEVİYESİNDE BİLİNEMEZ. `storage.objects` üzerinde yalnızca
-- `bucket_id`, `name` ve `owner` var; ilanla bağ ancak `listings.images`
-- dizisinde URL aranarak kurulabilirdi ve bu her dosya işleminde bir alt sorgu
-- demek olurdu — üstelik silme sırasında dosya listeden zaten çıkarılmış
-- olabileceği için yanlış cevap verirdi.
--
-- Bu yüzden kapsam YÜKLEYENE bağlanıyor: `owner = auth.uid()`. Pratikte
-- istenen sonucu veriyor — bir danışman kendi yüklediği dosyaları yönetir,
-- başkasınınkine dokunamaz; yönetici hepsine dokunur. Kaybedilen tek durum,
-- bir danışmanın devraldığı ilanın BAŞKASININ yüklediği fotoğrafını silmesi;
-- o dosya yönetici tarafından temizlenir.

-- --- Okuma: herkese açık ---------------------------------------------------
-- Bucket'lar zaten public; politika bunu açıkça yazıyor ki ileride bucket
-- private'a çevrilirse davranışın nerede değişeceği belli olsun.
drop policy if exists emlak_storage_public_read on storage.objects;
create policy emlak_storage_public_read on storage.objects
  for select
  using (bucket_id in ('listings', 'avatars'));

-- --- Yükleme ---------------------------------------------------------------
-- Personel kaydına bağlanmamış kullanıcı yükleyemez: uygulamanın geri kalanında
-- da hiçbir yazma hakkı yok (0002), Storage bir kaçak olmamalı.
drop policy if exists emlak_storage_insert on storage.objects;
create policy emlak_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('listings', 'avatars')
    and public.current_agent_id() is not null
  );

-- --- Güncelleme (upsert) ---------------------------------------------------
drop policy if exists emlak_storage_update on storage.objects;
create policy emlak_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('listings', 'avatars')
    and (owner = auth.uid() or public.is_manager())
  )
  with check (
    bucket_id in ('listings', 'avatars')
    and (owner = auth.uid() or public.is_manager())
  );

-- --- Silme -----------------------------------------------------------------
-- Server action'lar yetim dosyaları buradan siliyor; kullanıcının oturumuyla
-- çalıştıkları için bu politika onlar için de geçerli.
drop policy if exists emlak_storage_delete on storage.objects;
create policy emlak_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('listings', 'avatars')
    and (owner = auth.uid() or public.is_manager())
  );
