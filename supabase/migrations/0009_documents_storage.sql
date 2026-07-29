-- =============================================================================
-- Emlak CRM — `documents` bucket'ı (PRIVATE)
-- =============================================================================
-- Faz 12. Faz 7'de iki public bucket açılmıştı (`listings`, `avatars`); bu
-- üçüncüsü bilinçli olarak FARKLI kuruluyor.
--
-- -----------------------------------------------------------------------------
-- NEDEN PRIVATE — ÖNCEKİ İKİSİ NEDEN DEĞİL
-- -----------------------------------------------------------------------------
-- Public bucket'ta URL'i bilen herkes dosyayı indirir; kimlik doğrulaması yok,
-- iptal etme imkânı yok. Faz 7'de bu kabul edilebilirdi çünkü oradaki içerik
-- ZATEN YAYINLANMAK İÇİN VAR: ilan fotoğrafı portallara çıkacak, portre
-- avatarı arayüzde herkese görünüyor. Sızması diye bir kavram yok.
--
-- Burada içerik TAPU, KİMLİK FOTOKOPİSİ ve İMZALI SÖZLEŞME. Bunların kalıcı
-- ve tahmin edilebilir bir adresi olmamalı: bir kez paylaşılan link süresiz
-- geçerli kalır, e-postada, tarayıcı geçmişinde, sunucu loglarında yaşar.
--
-- Private bucket + imzalı URL bunu üç yerden kapatıyor:
--   1. Nesneye erişim oturum gerektiriyor (`storage.objects` politikası).
--   2. İmzalı URL SÜRELİ (bu projede 60 saniye) — sızsa bile kısa ömürlü.
--   3. URL sunucuda, kullanıcının kendi oturumuyla üretiliyor; belge satırını
--      göremeyen kullanıcı imza da alamıyor.
--
-- Bedeli: her indirme bir imzalama adımı ve önbelleklenemeyen bir adres.
-- Fotoğraf galerisi için bu maliyet anlamsızdı, tapu için ucuz.
--
-- -----------------------------------------------------------------------------
-- ASIL KAPI STORAGE POLİTİKASI DEĞİL, `documents` TABLOSU
-- -----------------------------------------------------------------------------
-- Faz 7'deki sorun burada da geçerli: dosya yolu düz (`<uuid>.<ext>`) olduğu
-- için bir nesnenin hangi müşteriye ait olduğu `storage.objects` üzerinden
-- BİLİNEMEZ. Ama bu sefer ilişki başka bir yerde duruyor — `documents`
-- tablosunda, kendi RLS'iyle.
--
-- Bu yüzden Storage politikası bilerek geniş: "aktif bir personelsen bu
-- bucket'ı okuyabilirsin". Erişimi gerçekten sınırlayan şey, NESNENİN YOLUNU
-- ÖĞRENEBİLMEK: yol yalnızca `documents` satırından geliyor, o satır da RLS'e
-- tabi ve yol tahmin edilemez bir uuid. Politikayı `owner = auth.uid()` ile
-- daraltmak, bir danışmanın kendi müşterisi için başkasının yüklediği tapuyu
-- açamaması demekti.
-- =============================================================================

-- =============================================================================
-- 1. Bucket
-- =============================================================================
-- Boyut sınırı 20 MB: taranmış çok sayfalı bir tapu ya da sözleşme PDF'i
-- fotoğraftan büyük olabiliyor ve burada sıkıştırma yok (belge içeriği
-- kayıpsız kalmalı).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 20971520,
   array['application/pdf',
         'image/jpeg', 'image/png', 'image/webp',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- 2. storage.objects politikaları
-- =============================================================================
-- 0003'teki politikalar `bucket_id in ('listings','avatars')` diye yazılmıştı,
-- yani bu bucket onların kapsamı dışında ve ayrıca tanımlanması gerekiyor.

-- --- Okuma -------------------------------------------------------------------
-- `for select` imzalı URL üretimi için de gerekli: `createSignedUrl` çağrısı
-- kullanıcının oturumuyla çalışıyor ve nesneyi okuyabildiğini doğruluyor.
-- Public read politikası YOK — `emlak_storage_public_read` bu bucket'ı
-- kapsamıyor, dolayısıyla anonim istek hiçbir şey göremiyor.
drop policy if exists emlak_documents_read on storage.objects;
create policy emlak_documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.current_agent_id() is not null
  );

-- --- Yükleme -----------------------------------------------------------------
drop policy if exists emlak_documents_insert on storage.objects;
create policy emlak_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.current_agent_id() is not null
  );

-- --- Silme -------------------------------------------------------------------
-- Yükleyen ve yöneticiler. Belge satırı silindiğinde server action nesneyi de
-- siliyor (`lib/storage/cleanup.ts`), kullanıcının oturumuyla — yani bu
-- politika oradaki temizlik için de geçerli.
drop policy if exists emlak_documents_delete on storage.objects;
create policy emlak_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (owner = auth.uid() or public.is_manager())
  );

-- Güncelleme (upsert) politikası BİLEREK YOK: belge yolları uuid, aynı yola
-- ikinci kez yazılmıyor. Bir belgenin yeni sürümü yeni bir kayıt.
