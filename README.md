# EstateFlow

Gayrimenkul ofisleri için, sıfırdan yazılmış bir müşteri ve portföy yönetim
uygulaması. Next.js 15 App Router ve Supabase üzerine kurulu; rol bazlı
yetkilendirme, gerçek dosya yükleme ve canlı ekip içi iş notları dahil **on iki
modülün tamamı** uçtan uca çalışıyor — "yakında" ekranı kalmadı.

Türkçe **ve İngilizce** arayüz, koyu tema, masaüstü + tablet + mobil.

> Bu bir portföy/vitrin projesidir. Mock veri yoktur — her ekran gerçek bir
> Postgres veritabanından okur, yetkilendirme gerçek RLS politikalarıyla
> yapılır.

---

## Ne yapabiliyor

| Modül | Kapsam |
| ----- | ------ |
| **Dashboard** | KPI kartları, 12 aylık satış grafiği, portföy dağılımı, aktivite akışı |
| **İlanlar** | Liste + filtre + detay + form + silme; çoklu fotoğraf yükleme, galeri |
| **Müşteriler** | Kayıtlar, ilan eşleştirme (alım/kiralama ayrımı), görüşme geçmişi |
| **Randevular** | Gün/hafta/ay takvimi, kütüphanesiz sürükle-bırak, renk kodlu kategoriler |
| **Mesajlar** | Ekip içi iş notu panosu: soru / atama / not, @mention, dosya eki, **canlı** rozet |
| **Evraklar** | Müşteri arama odaklı belge erişimi; **private** depolama + süreli imzalı indirme |
| **Satışlar** | Teklif → satış akışı tek aksiyonda; kapanan işlemler ve prim hesabı |
| **Personeller** | Ekip listesi, davet (Auth Admin API), rol/prim yönetimi, pasifleştirme |
| **Bildirimler** | Kişisel gelen kutusu, **canlı** zil rozeti, tür bazlı tercihler |
| **Ayarlar** | Profil, şifre değiştirme, bildirim tercihleri, şirket bilgileri |
| **Profil** | Kapak görseli, performans özeti, veriden hesaplanan rozetler |
| **Gelirler** | Komisyon ve tahsilat takibi; aylık trend, danışman bazlı döküm |
| **Raporlar** | Portföy dağılımı, dönem filtreli satış trendi, ekip sıralaması |

---

## Teknolojiler

| Katman | Seçim |
| ------ | ----- |
| Çatı | Next.js 15.5 (App Router, Server Components, Server Actions) |
| Dil | TypeScript 5 — `strict`, veritabanı şeması generic olarak bağlı |
| Veritabanı | Supabase (Postgres + **Row Level Security**) |
| Kimlik | Supabase Auth — e-posta/şifre + Google/Apple OAuth |
| Depolama | Supabase Storage — iki public bucket + bir **private** bucket |
| Canlı veri | Supabase Realtime — yalnızca iş notları ve bildirimler |
| Arayüz | Tailwind CSS v4, shadcn/ui (Radix), framer-motion, lucide |
| Form | react-hook-form + zod |
| Çok dillilik | **next-intl** — Türkçe / İngilizce, URL öneki yok; **tamamlandı** |
| Test | Vitest — 326 test, 19 dosya |

Grafikler **kütüphanesiz**: SVG doğrudan üretiliyor (`lib/chart.ts`).
Takvimdeki sürükle-bırak da öyle — Pointer Events, ek bağımlılık yok.

---

## Kurulum

Gereksinim: **Node.js 20+** ve bir Supabase projesi (ücretsiz katman yeterli).

### 1. Klonlayın ve bağımlılıkları kurun

```bash
git clone <repo-url> estateflow && cd estateflow && npm install
```

> `typescript` sürümü **5.x**'e sabitli. TypeScript 7'ye yükseltmek
> `@/…` yol takma adlarını sessizce bozuyor.

### 2. Ortam değişkenleri

```bash
cp .env.example .env.local
```

Değerleri Supabase Dashboard → **Project Settings → API Keys** altından
doldurun. Hangi anahtarın nereye gittiği ve neden, `.env.example` içinde
yazılı.

### 3. Şema

`supabase/migrations/` altındaki **on üç dosyayı sırayla** Supabase Dashboard →
**SQL Editor**'a yapıştırıp çalıştırın. Hepsi idempotenttir; tekrar
çalıştırmak zarar vermez.

<details>
<summary>Migration listesi</summary>

| Dosya | İçerik |
| ----- | ------ |
| `0001_init.sql` | Sekiz tablo, index, `updated_at` trigger'ları, RLS |
| `0002_agents_auth_link.sql` | `agents` ↔ Auth bağı, roller, **rol bazlı RLS** |
| `0003_storage.sql` | `listings` + `avatars` bucket'ları |
| `0004_offers_unique_pending.sql` | Çift bekleyen teklifi engelleyen kısmi indeks |
| `0005_rls_performance.sql` | Politikalarda `(select …)` sarmalaması |
| `0006_agent_management.sql` | `is_active`, denetim kaydı |
| `0007_appointments.sql` | Randevular |
| `0008_messaging.sql` | Konuşmalar, mesajlar, evraklar, bildirimler + Realtime |
| `0009_documents_storage.sql` | **private** `documents` bucket'ı |
| `0010_settings.sql` | Bildirim tercihleri, kapak görseli, şirket ayarları |
| `0011_commission.sql` | Komisyon tahsilat durumu (`sales.commission_status`) |
| `0012_work_notes.sql` | **İş notları** — `conversations`/`messages` düşüyor, `work_notes` geliyor |
| `0013_demo_role.sql` | **Demo rolü** — salt okunur tanıtım hesabı, yalnızca SELECT politikaları |

`0012` `0008`'in kurduğu iki tabloyu **düşürüyor**. Sırayla çalıştırıldığında
sorun yok: `0008` tabloları kurar, `0012` onların yerine `work_notes` koyar.
Neden bu yol seçildiği aşağıda, "Neden mesajlaşma değil iş notu" başlığında.

</details>

### 4. Demo veri

```bash
npm run seed
```

46 ilan, 64 müşteri, randevular, iş notları, evraklar ve bildirimler üretir —
her sayfa dolu açılır. Tarihler script'in çalıştığı ana göre üretilir, yani
demo hep taze görünür.

İlan görselleri **kategoriye göre elle seçilmiş** Unsplash kareleri: dairede iç
mekân, villada bina, ofiste çalışma alanı, arsada arazi. Önceki sürüm
`picsum.photos` kullanıyordu ve kategori kavramı olmadığı için bir daire
ilanının kapağında kahve çekirdeği çıkabiliyordu. Havuzlar
`scripts/seed-supabase.ts` içinde, her kimlik tek tek doğrulandı.

Müşteri kayıtlarında **fotoğraf yok**; arayüz her yerde baş harf gösteriyor
("Erden Şahenk" → "EŞ"). Gerekçe
[`customer-avatar.tsx`](src/components/customers/customer-avatar.tsx)
başlığında.

> ⚠️ Seed **mevcut kayıtları siler**. Kendi verinizle çalışıyorsanız
> çalıştırmayın.

### 5. Test kullanıcısı

Supabase Dashboard → **Authentication → Users → Add user** ile bir hesap açın,
sonra `0002_agents_auth_link.sql` içindeki e-postayı kendi hesabınızla
değiştirip o bölümü tekrar çalıştırın. Seed bağı korur.

### 6. Demo hesabı (isteğe bağlı)

Herkese açık, salt okunur bir tanıtım hesabı. Kurulumu test kullanıcısıyla
aynı: Dashboard → **Authentication → Users → Add user** ile
`demo@estateflow.app` hesabını açın, sonra `0013_demo_role.sql` dosyasını
tekrar çalıştırın (bağ kurulur). Şifre için aşağıdaki nota bakın.

Gerekmiyorsa atlayın — uygulamanın geri kalanı bu hesap olmadan da çalışır.

### 7. Çalıştırın

```bash
npm run dev
```

---

## Komutlar

| Komut | İş |
| ----- | -- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm test` | Vitest (tek seferlik) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Demo veriyi yeniden üretir |
| `npm run gen:types` | Şema tiplerini Supabase'den çeker |

`npm run dev` çalışırken `npm run build` ÇALIŞTIRMAYIN: ikisi de `.next`
klasörünü kullanır ve derleme, çalışan sunucunun altındaki dosyaları siler —
ekran bomboş kalır. Üretim modunu geliştirme sunucusunu kapatmadan ölçmek için
çıktı klasörünü değiştirin:

```bash
NEXT_DIST_DIR=.next-prod npx next build && NEXT_DIST_DIR=.next-prod npx next start -p 3100
```

PowerShell'de: `$env:NEXT_DIST_DIR=".next-prod"` satırını önce çalıştırın.

---

## Vercel'e deploy

**Build komutu ve çıktı dizini varsayılan** — Next.js otomatik algılanır,
`vercel.json` gerekmez.

### Ortam değişkenleri

| Değişken | Ortam | Not |
| -------- | ----- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | **Derleme zamanında da gerekli** — `next.config.mjs` görsel host'unu ondan türetiyor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview | RLS'e tabi, istemciye açık olması normal |
| `SUPABASE_SECRET_KEY` | Production + Preview | ⚠️ Yalnızca sunucu. Eksikse **personel daveti** çalışmaz, uygulamanın geri kalanı çalışır |

`SUPABASE_ACCESS_TOKEN` deploy için **gerekmez** (yalnızca `npm run gen:types`).

### Supabase tarafında yapılması gerekenler

1. **Auth → URL Configuration → Redirect URLs**: Vercel alan adınızı ekleyin
   (`https://<proje>.vercel.app/auth/callback`). Eksikse Google/Apple girişi
   dönüşte başarısız olur. Preview deploy kullanacaksanız `https://*.vercel.app`
   joker kaydını da ekleyin.
2. **Auth → URL Configuration → Site URL**: üretim alan adı.
3. Migration'ların **tamamı** üretim veritabanında çalışmış olmalı.

### Canlıda farklı davranabilecek noktalar

- **Storage CORS.** Supabase Storage varsayılan olarak tüm origin'lere izin
  verir, yani ek ayar gerekmez. Ama proje ayarlarından kısıtlarsanız iki akış
  kırılır: tarayıcıdan doğrudan yükleme (`lib/storage/upload*.ts`, XHR ile
  Storage'a gidiyor) ve imzalı belge indirme.
- **İmzalı URL süresi 60 saniye.** Sunucu ile istemci saati arasında ciddi bir
  fark varsa bağlantı "süresi dolmuş" görünebilir.
- **Realtime.** `0012_work_notes.sql` yayındaki tabloları `work_notes` +
  `notifications` olarak bırakıyor. Üretim veritabanında bu migration
  çalışmadıysa rozetler canlı güncellenmez — sayfa yenilenince doğru görünür,
  yani sessiz bir kayıp.
- **Ücretsiz katman uykusu.** Supabase ücretsiz projeler bir süre kullanılmazsa
  duraklıyor; ilk istek birkaç saniye sürebilir.
- **`npm run seed` üretimde çalıştırılmamalı** — mevcut kayıtları siler.

---

## Mimari kararlar

Bu projede her önemli karar **neden öyle yapıldığıyla birlikte** yazılı:
kod içi başlık yorumlarında ve ayrı bir belgede.

📄 **[docs/MIMARI.md](docs/MIMARI.md)** — ~1600 satır; faz faz ne yapıldığı,
hangi alternatifin neden elenmediği ve nelerin bilerek yapılmadığı.

Öne çıkan birkaçı:

- **RLS tek yetki kaynağı.** Arayüzdeki rol kontrolleri yalnızca kullanılamaz
  düğmeleri gizliyor; veriyi politikalar koruyor.
- **Servis anahtarı tek bir dosyada.** Yalnızca personel daveti onu
  gerektiriyor; o dosya `server-only` ve her fonksiyonu rol kontrolüyle
  başlıyor.
- **Evraklar private + imzalı URL**, ilan fotoğrafları public — ayrımın
  gerekçesi içeriğin doğası.
- **Realtime yalnızca iki yerde.** Veriyi başkası değiştiriyorsa değerli;
  kendi eyleminde `router.refresh()` zaten yeterli.
- **Mesajlaşma değil iş notu.** Müşteriyle yazışma dış kanallarda yürüyor;
  uygulama içinde gerçekten yürüyen iletişim ekip içi olanı (aşağıda).
- **Atama notu gerçekten devrediyor.** Görsel bir kayıt değil, `assigned_agent_id`
  değiştiren bir işlem (aşağıda).
- **Rozetler saklanmıyor, hesaplanıyor.** Rozet zaten bir sorgu sonucu.
- **Gelirler ≠ Satışlar.** Aynı tablo, farklı soru: biri "hangi işlemler
  kapandı", diğeri "komisyonum tahsil edildi mi".

---

## Çok dillilik (Faz 19–25) — TAMAMLANDI

Arayüz **Türkçe ve İngilizce**. Seçim üst çubuktaki küre simgesinden yapılıyor,
tercih bir çerezde saklanıyor ve oturumdan bağımsız korunuyor.

Yedi faz sürdü ve **bitti**: uygulamanın her sayfası, her formu, her hata
bildirimi iki dilde çalışıyor. Özet aşağıda, "Serinin kapanışı" başlığında.

### Neden next-intl

| Aday | Neden seçilmedi / seçildi |
| ---- | ------------------------- |
| **next-intl** | ✅ App Router için yazılmış; **sunucu bileşenlerinde** de `useTranslations()` çalışıyor. Bu belirleyici oldu: uygulamanın sayfaları sunucu bileşeni ve çeviriyi istemciye taşımak her sayfayı `"use client"` yapmak demekti. |
| react-i18next | Olgun ama kanca tabanlı; sunucu bileşeninde çalışmıyor. |
| next-i18next | Pages Router çağından; App Router desteği yok. |
| Elle sözlük nesnesi | Bağımlılık istemez ama çoğul kuralları, tarih/sayı biçimleri ve eksik anahtar denetimi elle yazılırdı. |

### URL'de dil öneki YOK

next-intl'in varsayılan kurulumu `/tr/ilanlar`, `/en/ilanlar` üretir ve
`app/[locale]/…` yapısı ister. Bu projede **seçilmedi**:

1. **Route'lar Türkçe slug.** `/ilanlar`, `/musteriler` İngilizce arayüzde de
   aynı kalıyor — adresleri çevirmek her bağlantıyı, her `revalidatePath()`
   çağrısını ve kaydedilmiş bağlantıları kırardı. Önek yalnızca gürültü
   eklerdi: `/en/ilanlar`.
2. **Middleware zaten sahipli.** `src/middleware.ts` her isteği görüyor ve
   yönlendirme kararlarını o veriyor (`/` → dashboard, oturumsuz → login,
   `?next=` ile geri dönüş). next-intl'in kendi middleware'i de yönlendirme
   yapıyor; ikisini zincirlemek iki ayrı otorite demekti.
3. **Dil bir kullanıcı tercihi, bir adres değil.** Oturum arkasındaki bir CRM
   indekslenmiyor, yani önekin SEO faydası da yok.

Sonuç: `src/middleware.ts` **hiç değişmedi**. Doğrulandı — dil çerezi varken de
yokken de `/ilanlar` isteği `/login?next=%2Filanlar` üretiyor, `?next=` bozulmuyor.

### Dosya organizasyonu

```
messages/
  tr.json    ← referans dil (kaynak metinler Türkçe yazılıyor) · 1167 anahtar
  en.json    ← çeviri · 1167 anahtar, fark yok
src/i18n/
  config.ts        ← diller, varsayılan, çerez adı, etiketler
  locale.ts        ← çerez okuma/yazma + Accept-Language pazarlığı
  request.ts       ← next-intl istek yapılandırması, tarih biçimleri
  dates.ts         ← dil bilen tarih yardımcıları (formatDate / formatRelative / formatMonthKey)
  numbers.ts       ← dil bilen ölçüler (formatRate / formatPercent / formatDelta / formatBytes)
  upload-error.ts  ← UploadError anahtarını metne çeviren kanca
  messages.test.ts ← iki dosyayı karşılaştıran bütünlük testleri
```

Sözlükler **modül bazlı** gruplanmış; tek dev bir dosya değil:

| Grup | Kapsam |
| ---- | ------ |
| `common` | Tekrar eden ortak metinler (kaydet, vazgeç, ara, çıkış yap…) |
| `nav` | Menü öğelerinin etiket + açıklamaları ve grup başlıkları |
| `navbar` · `sidebar` · `mobileNav` | Gezinme katmanına özgü metinler |
| `commandPalette` | Cmd+K paleti |
| `notices` · `errors` | Uyarı ve hata ekranları; `errors.actions` tipli hata kataloğu |
| `auth` | Giriş akışı ve giriş hataları |
| `dashboard` · `listings` · `customers` · `appointments` | Modül sayfaları |
| `workNotes` · `documents` · `notifications` | İş notu, evrak, bildirim |
| `offers` · `sales` · `revenue` · `reports` | Satış ve finans |
| `agents` · `settings` · `profile` | Personel, ayarlar, profil |
| `upload` | Paylaşılan yükleme yüzeyleri ve yükleme hataları |
| `filters` · `agentField` | Modüller arası paylaşılan parçalar |

`config/navigation.ts` artık **yalnızca yapı** taşıyor (adres, ikon, grup);
etiketler `nav.<key>.label` altında. Menü yapısı bir yapılandırma, etiketler
ise içerik — ikisi birlikte dururken bir dil eklemek o dosyayı çoğaltmayı
gerektirirdi.

**İki güvenlik ağı var:**
`src/types/i18n.d.ts` anahtarları TypeScript'e bildiriyor (yanlış yazım
derleme zamanında hata), `src/i18n/messages.test.ts` ise iki dosyayı
karşılaştırıyor (eksik anahtar, boş değer ve eşleşmeyen `{degisken}`
yer tutucusu testte düşüyor).

### Tarih ve para birimi

| Ne | Karar | Neden |
| -- | ----- | ----- |
| **Tarih** | Dile göre değişir | Ay adları ve gün/ay sırası dilin parçası; İngilizce arayüzde "31 Tem 2026" okunmuyor. Adlandırılmış biçimler `i18n/request.ts` içinde (`short`, `long`, `time`). |
| **Para birimi** | Her dilde `tr-TR` | Tutar Türk Lirası ve sözleşmede, tapuda, portalda hep "18.450.000" yazıyor. İngilizce arayüzde "18,450,000" göstermek aynı sayının iki farklı yazımını üretir — Türkiye'de nokta binlik ayracı olduğu için **okuma hatası riski**. Para, arayüz metninden çok veriye yakın. |
| **Yüzde / oran** | Dile göre değişir | Faz 20'nin "sabit `tr-TR`" kararı **yalnızca para birimi** içindi; oran bir ölçü, tutar değil. Türkçe arayüzde "%2.0" yazıyordu — ayraç virgül olmalı. `Intl` hem ayracı hem işaretin yerini çözüyor: `%2,0` · `2.0%`. |
| **Dosya boyutu** | Dile göre değişir | Yüzdeyle aynı gerekçe, aynı hata: `formatBytes` ayracı elle koyuyordu (`.replace(".", ",")`), yani boyut her dilde Türkçe yazılıyordu. `Intl` birimi de yerleştiriyor: `8,0 MB` · `8.0 MB`. |
| **Adet / alan** | Her dilde `tr-TR` | Fiyatla aynı satırda görünüyorlar; binlik ayracın orada şaşması para okumasını bozardı. |

> **Kural tek cümlede:** para birimi sabit, yüzde/oran ve dosya boyutu dile
> göre biçimlenir.

### Neler çevrilmiyor

> **Kural tek cümlede:** kullanıcı içeriği çevrilmez, sadece arayüz metni
> çevrilir.

Sınır şu soruyla çiziliyor: **bu metni uygulama mı yazdı, bir insan mı?**
`listings.title`, `listings.description`, `appointments.title`,
`work_notes.content`, `customers.notes` gibi serbest metin alanlarına yazılanı
uygulama üretmiyor — kullanıcı (ya da seed) giriyor. Onlar veri; bir kayıt
sonradan okuyanın diline göre değişemez. Bu davranış Faz 21/22'de randevu
başlıkları ve bildirim satırlarıyla belirlenmişti, bütün serbest metin alanları
için geçerli.

- **Seed/veri içeriği** — ilan başlıkları, müşteri adları, iş notu metinleri.
  Bunlar veri, arayüz metni değil.
- **Route adresleri** — yukarıda gerekçesi yazılı.
- **Marka adı** — "EstateFlow" her dilde EstateFlow.
- **Dış kaynaklı hata mesajları** — Supabase ve OAuth sağlayıcılarından gelen
  metinler. Onları çevirmek olmayan bir sözlüğü uydurmak olurdu.
- **Veritabanına yazılan metin** — randevu başlıkları, aktivite akışı satırları
  ve bildirim başlık/açıklamaları. Kaydedilmiş bir satır, sonradan okuyanın
  diline göre değişemez (aşağıda desen 5b).
- **Enum değerleri** — `agents.role` `'patron'`, `listings.status` `'satilik'`,
  takvim görünümü `?view=hafta`. RLS politikaları ve URL'ler bu değerleri metin
  olarak karşılaştırıyor; çevrilen şey yalnızca görünen etiket.
- **Geliştiriciye yönelik hatalar** — `throw new Error(...)` ve `console.error`
  satırları. Bunlar kullanıcıya değil, günlüğe gidiyor.

### Modül çeviri durumu

Çeviri **modül modül** ilerledi ve Faz 25'te kapandı. Tablodaki her satır
"o modülde hardcoded Türkçe kalmadı" demek.

| Modül | Durum |
| ----- | ----- |
| Altyapı (next-intl, çerez, dil seçici) | ✅ Tamam |
| Navbar · Sidebar · mobil gezinme · menü çekmecesi | ✅ Tamam |
| Komut paleti (Cmd+K) | ✅ Tamam |
| Ortak metinler, hata ekranı, uyarı bildirimleri | ✅ Tamam |
| Giriş ekranı (`auth`) | ✅ Tamam |
| Filtre çubuğu kabuğu (tüm modüllerde ortak) | ✅ Tamam |
| **Dashboard** — KPI, grafikler, aktivite akışı | ✅ Tamam |
| **İlanlar** — liste, detay, form, zod mesajları | ✅ Tamam |
| İlan kategorileri ve durumları (paylaşılan sözlük) | ✅ Tamam |
| Teklif diyaloğu (`offers` — ilan **ve** müşteri girişi) | ✅ Tamam |
| Detaya gömülü bölümler: İş Notları kartı, Evraklar kartı, randevu satırı, müşteri durum rozeti | ✅ Tamam |
| **Müşteriler** — liste, detay, form, zod mesajları, zaman çizelgesi | ✅ Tamam |
| **Randevular** — takvim (gün/hafta/ay), form, panel, filtreler | ✅ Tamam |
| Gün ve ay adları (`Intl`e geçti, sabit dizi kalmadı) | ✅ Tamam |
| **Mesajlar** — iş notu panosu, sekmeler, boş durumlar | ✅ Tamam |
| **Evraklar** — müşteri arama, arşiv, filtreler, özet | ✅ Tamam |
| **Bildirimler** — gelen kutusu, navbar zili, tür etiketleri | ✅ Tamam |
| **Satışlar · Teklifler** — liste, filtreler, kabul/red akışı | ✅ Tamam |
| **Gelirler** — özet kartlar, trend, danışman dökümü, tahsilat | ✅ Tamam |
| **Raporlar** — portföy, satış, ekip performansı, dönem filtresi | ✅ Tamam |
| **Personeller** — liste, detay, düzenleme, davet akışı, pasifleştirme | ✅ Tamam |
| **Ayarlar** — profil, şifre, bildirim tercihleri, görünüm/dil, şirket, API | ✅ Tamam |
| **Profil** — kapak, istatistik kartları, hesap bilgileri, rozetler | ✅ Tamam |
| Yükleme yüzeyleri (portre, kapak, galeri, evrak) ve yükleme hataları | ✅ Tamam |
| Giriş hataları (`lib/auth/client.ts` → `auth.errors.*`) | ✅ Tamam |
| Tarihlerin formatter'a geçişi | ✅ Tamam (`i18n/dates.ts` + `lib/calendar.ts`) |
| Server action hata metinleri (`result.error`) | ✅ Tamam — tüm modüller, tipli katalog |

Seri boyunca bekleyen modüller **Türkçe kaldı** — yarım çevrilmiş bir sayfa
yerine tutarlı bir Türkçe sayfa gösterildi. Artık bekleyen modül yok.

Kural **sayfa** değil **bileşen** düzeyinde işledi ve bunun iki sonucu vardı.

**Gömülü bölümler sayfasıyla birlikte çevriliyor.** İlan detayındaki "İş
Notları" ve "Evraklar" kartları, randevu satırları ve müşteri durum rozetleri
başka modüllere ait ama o sayfada görünüyorlar — yarısı İngilizce bir ekran
kabul edilebilir bir ara durum değil. Bu yüzden dört bileşen kendi
modüllerinden önce çevrildi.

**Bileşenler paylaşıldığı için etki tek sayfayla sınırlı kalmıyor.**
`WorkNoteCard`, `WorkNoteComposer`, `DocumentRow` ve `DocumentDropzone` aynı
zamanda `/mesajlar` ve `/evraklar` sayfalarında çiziliyor; onlar o fazda
çevrildi, sayfa kabukları ise Faz 23'te tamamlandı. İki parça birleşince o
sayfalarda hardcoded Türkçe kalmadı.

### Modül çevirisinde tekrarlanan üç desen

Faz 20'de Dashboard ve İlanlar çevrilirken üç şey netleşti; kalan modüller de
aynı yolu izleyecek.

**1. Sözlük dosyaları yalnızca yapı taşır.** `config/navigation.ts` Faz 19'da
etiketlerini bıraktı; `lib/listings.ts` Faz 20'de aynısını yaptı.
`CATEGORY_LABELS` ve `STATUS_LABELS` kaldırıldı, yerine sıralı anahtar
listeleri (`LISTING_CATEGORIES`, `LISTING_STATUSES`) geldi. Hangi kategoriler
var ve hangi sırayla — bu bir yapılandırma; ne yazdıkları içerik.
**Veritabanı değerlerine dokunulmadı**: kolon hâlâ `'satilik'` tutuyor, çeviri
yalnızca görüntüleme katmanında.

**2. Cümleler parça parça birleştirilmez.** Aktivite akışı "özne + fiil" diye
ikiye bölünüyordu ve Türkçede çalışıyordu ("Kadıköy dairesi portföye
eklendi"). İngilizcede sözcük sırası değişiyor — *"an offer came in for
Kadıköy dairesi"* — özne cümlenin ortasına düşebiliyor. Bu yüzden kalıbın
tamamı tek bir çeviri metni; kalın yazım `<b>` etiketiyle metnin içinde ve
`t.rich` onu React elemanına çeviriyor.

Yüzde işareti bir süre aynı yolla, çeviri metninin içinde taşındı
(`"%{rate}"` · `"{rate}%"`). Faz 25'te oradan da çıktı: `Intl`in yüzde biçimi
işaretin yerini zaten biliyor ve aynı bilgiyi iki dilde elle tekrar etmeye
gerek yok — ayrıntı `i18n/numbers.ts` başlığında.

**3. Zod şemaları fabrikaya dönüşür.** Doğrulama mesajları çeviriden geldiği
için şema modül düzeyinde bir sabit olamıyor —
`createListingFormSchema(t, labels)` çağrılıyor ve form onu `useMemo` içinde
kuruyor. Alan adları (`{label} zorunludur`) formun kendi etiketinden
besleniyor, doğrulama sözlüğünde ikinci bir kopyası tutulmuyor.

**3b. Takvimin gün/ay adları da `Intl`e devredilir.** `lib/calendar.ts` on
dokuz Türkçe kelimeyi elde tutuyordu ve gerekçesi teknikti: gün anahtarını
(`"2026-07-28"`) `Date`e çevirip `Intl`e vermek, modülün özenle kaçındığı saat
dilimi çözümlemesini geri getirirdi. İki dilde bu gerekçe düştü — iki dizi
tutmak `Intl`i elle yeniden yazmak olurdu. Endişe de burada geçersiz: anahtar
UTC gece yarısı okunuyor, biçimlendirici Europe/Istanbul'a sabit ve **Türkiye
UTC'nin daima ilerisinde**, yani gün kayması mümkün değil. Ters yönde (Amerika
saat dilimleri) tutmazdı; varsayım bu yüzden hem kodda hem testte açık yazılı
(`calendar.test.ts` → "gün anahtarı hiçbir dilde komşu güne kaymıyor").

**4. Tarihler `lib/format.ts`ten çıkar.** Oradaki `formatDate` senkron ve sabit
`tr-TR` — İngilizce arayüzde "23 Mart 2026" basıyordu. Yerine `i18n/dates.ts`
içindeki `formatDate(format, value, style?)` geldi: biçimlendiriciyi çağrı
yerinden alıyor (`getFormatter()` sunucuda, `useFormatter()` istemcide), boş
değeri "—" olarak karşılıyor ve biçim adını (`short` / `long`)
`i18n/request.ts` ile aynı iki isme daraltıyor. `lib/format.ts` para ve sayı
için `tr-TR`'de kalmaya devam ediyor; gerekçesi o dosyanın başlığında.

**5. Sırası gelmemiş modülün sözlüğü SİLİNMİYOR, perçinleniyor.**
`lib/listings.ts`te etiket sabitleri tamamen kaldırılmıştı çünkü o modülün her
çağrı yeri aynı fazda çevrildi. İş notu, evrak, randevu ve müşteri
etiketlerinde bu mümkün olmadı: sabitleri kaldırmak, henüz sırası gelmemiş
dört sayfayı da çevirmeyi zorunlu kılardı. Sabitler bu yüzden yerinde bırakıldı
ve geçici olarak iki kaynak oluştu — çevrilmiş yüzeyler sözlükten, çevrilmemiş
sayfalar sabitten okuyordu. Sapma riskini `messages.test.ts` kapattı: Türkçe
sözlüğün değerlerini sabitlerle **birebir** karşılaştıran testler.

Faz 21'de randevu ve müşteri sabitleri, Faz 23'te iş notu/evrak/bildirim
sabitleri, Faz 24'te teklif ve komisyon sabitleri, Faz 25'te de son üçü
(`AGENT_ROLE_LABELS`, `NOTIFICATION_PREFERENCE_FIELDS`, rozet metinleri)
modülleriyle birlikte silindi. Perçin testleri de onlarla gitti; yerlerini
"her değerin iki dilde bir metni var mı" sorusuna bıraktılar.

Geriye tek bir bilinçli istisna kaldı: `lib/appointments.ts` içindeki
`STORED_TYPE_LABELS` — gerekçesi hemen aşağıda.

**5b. Kaydedilen metin çevrilmez.** Randevular bu ayrımı görünür kıldı.
`lib/appointments.ts` içindeki `STORED_TYPE_LABELS` bilerek Türkçe ve dışa
aktarılmıyor: ürettiği metin ekrana değil `appointments.title` kolonuna,
aktivite akışına ve müşterinin görüşme geçmişine YAZILIYOR. Kaydedilmiş bir
satır, sonradan okuyanın diline göre değişemez — seed'deki ilan başlıkları
gibi veri sayılıyor. Aynı türün formdaki yer tutucusu ise çeviriden geliyor;
ikisi aynı kelimeyi gösterir ama farklı yerden alır ve bu bir tekrar değil,
bir sınır.

**6. Server action hata metinleri de çevrilir — ama başka bir yolla.**
Faz 21'in sonunda `result.error` her yerde Türkçeydi: İngilizce bir formda
doğru etiketler, altında Türkçe bir hata bildirimi. Sebep yapısaldı —
`fail()` hazır METİN alıyordu.

Faz 22'de `fail()` **anahtar** almaya başladı ve çeviriyi kendisi çözüyor
(`lib/actions/result.ts`). İki şey bunu mümkün kıldı:

- Server action bir istek bağlamında çalışıyor, yani `getTranslations()`
  orada da geçerli ve dil çerezi zaten okunuyor.
- `fail` asenkron oldu ama **çağrı yerleri değişmedi**: hepsi
  `return fail(...)` biçiminde ve `async` bir fonksiyondan promise döndürmek
  onu otomatik çözüyor. Tek gerçek değişiklik argümanın türü.

Katalog tipli (`ActionErrorKey`), yani `fail("Türkçe metin")` artık bir
derleme hatası — sonraki modüller eski desene dönemiyor. `messages.test.ts`
birliği kaynak dosyadan okuyup iki yönlü denetliyor: birlikte olup sözlükte
olmayan anahtar da, sözlükte olup birlikte olmayan ölü çeviri de düşürüyor.

**Saf katman anahtar taşır, cümleyi action kurar.** `canTransition` ve
kardeşleri (`lib/offers.ts`, `lib/appointments.ts`, `lib/revenue.ts`) senkron
ve saf; çeviri asenkron. Bu yüzden artık hazır cümle değil `{ error, params }`
döndürüyorlar — `params` içindeki değerler DURUM DEĞERLERİ, action onları
kendi sözlüğünden etikete çevirip `fail`e veriyor.

**Dış metin hâlâ çevrilmiyor.** Supabase ve Auth sağlayıcısının kendi
cümleleri `raw()` ile geçiyor. Sarmalayıcı bir tip, "bu bilinçli" demenin
yolu: düz `string` kabul edilseydi anahtar yazmayı unutmak sessizce geçerdi.

**6b. Aynı sözcük, iki biçim: etiket ve cümle içi.** Dönem seçeneği bir
sekmede tek başına duruyor ("Last 3 months") ama bir cümlenin ortasına da
giriyor ("No commission in …"). İngilizcede bu ikisi aynı olamaz — büyük harf
cümleyi bozuyor. Türkçede fark yok, çünkü placeholder cümlenin BAŞINDA
("Son 3 ay içinde komisyon yok"). Bu yüzden `revenue.period.*` yanına
`revenue.periodPhrase.*` eklendi ve yalnızca İngilizce'de ayrışıyor
(`the last 3 months`). Faz 21'deki `budgetMinName` ile aynı gerekçe: bir
etiketin başlık biçimi ile cümle biçimi her zaman aynı değil.

**6c. Saf modül metin değil ANAHTAR taşır — action'ların dışında da.**
Faz 22'nin `fail()` çözümü aynı sınırın üç yerde daha geçerli olduğunu
gösterdi ve Faz 25'te üçü de aynı desene geçti:

| Nerede | Önce | Sonra |
| ------ | ---- | ----- |
| `lib/storage/upload.ts` | `new UploadError("...çok büyük...")` | `new UploadError("tooLarge", { name, size, limit })` |
| `lib/auth/client.ts` | `{ ok: false, error: "E-posta veya şifre hatalı." }` | `{ ok: false, error: { key: "invalidCredentials" } }` |
| `lib/badges.ts` | `{ label: "İlk Satış", description: "..." }` | `{ id: "firstSale" }` |

Üçü de saf, senkron ve hem sunucudan hem istemciden çağrılabilir — yani aktif
dili okuyamazlar. Metni **çağıran** üretiyor: yükleme hataları için
`useUploadErrorMessage()` kancası (beş yükleme yüzeyi aynı üç satırı
yazmasın), rozetler için `agents.badges.item.<id>.*`. `raw` alanı ikisinde de
`RawActionError`in karşılığı: Supabase'in sözlükte yeri olmayan mesajı için
uydurma çeviri yerine ham metin.

Aynı sınır `lib/auth/session.ts` içinde de vardı — görünen adın ve unvanın
yedekleri sabit Türkçeydi. Orada anahtar yerine **parametre** verildi
(`SessionFallbacks`), çünkü çağıran zaten asenkron bir sunucu fonksiyonu ve
middleware tarafının o metinleri hiç çizmediği biliniyor.

**7. İngilizce çoğul, Türkçede olmayan bir sorun.** "3 interested customers"
sayı 1 olduğunda kırılıyor; Türkçede sayıdan sonra çoğul eki olmadığı için
"1 müşteri" ve "3 müşteri" aynı kalıpla çalışıyor. Bu yüzden aynı anahtar bir
dilde düz (`{count} müşteri…`), diğerinde ICU çoğulu
(`{count, plural, =1 {…} other {# …}}`) olabiliyor. `messages.test.ts`
içindeki yer tutucu denetimi bu yüzden metnin şekline değil **argüman adına**
bakıyor.

### Serinin kapanışı

**Yedi faz, 1167 anahtar, iki dil, sıfır fark.**

| Faz | Ne yapıldı |
| --- | ---------- |
| 19 | Altyapı: next-intl, çerez, dil seçici, gezinme katmanı, ortak metinler |
| 20 | Dashboard + İlanlar; `lib/listings.ts` etiketleri sözlüğe; `i18n/dates.ts` |
| 21 | Müşteriler + Randevular; takvim gün/ay adları `Intl`e |
| 22 | Server action hata metinleri — tipli katalog (`ActionErrorKey`) |
| 23 | Mesajlar + Evraklar + Bildirimler |
| 24 | Satışlar + Teklifler + Gelirler + Raporlar |
| 25 | Personeller + Ayarlar + Profil; yükleme/giriş hataları; son tarama |

**Kalıcı mimari kararlar** — hepsi seri boyunca sınandı ve değişmedi:

1. **URL'de dil öneki yok.** `/ilanlar` her dilde `/ilanlar`. Dil bir kullanıcı
   tercihi, bir adres değil; ayrıca `src/middleware.ts` yönlendirmenin tek
   sahibi ve next-intl'in middleware'iyle zincirlenmedi. Middleware seri
   boyunca **hiç değişmedi**.
2. **Para birimi her dilde `tr-TR`; yüzde/oran değil.** "18.450.000"
   sözleşmede, tapuda ve ilan portalında böyle yazıyor; İngilizce arayüzde
   "18,450,000" göstermek okuma hatası riski üretirdi. Aynı gerekçeyle adet ve
   alan da `tr-TR` — ikisi de fiyatla aynı satırda görünüyor. **Yüzde bu
   kuralın dışında** ve Faz 25'te ayrıldı: oran bir ölçü, tutar değil.
   `Intl.NumberFormat` hem ondalık ayracını hem yüzde işaretinin yerini
   çözüyor (`i18n/numbers.ts`). **Dosya boyutu** da aynı kefede — o da bir
   ölçü ve `formatBytes` ayracı elle koyuyordu.
3. **Tarih dile göre değişir.** Ay adları ve alan sırası dilin parçası.
   `lib/format.ts` içindeki tarih fonksiyonları Faz 25'te **silindi** —
   çağıranı kalmamıştı ve duran bir kopya yeni bir sayfanın yanlışlıkla sabit
   Türkçe tarih üretmesine davetiyeydi.
4. **Veritabanı içeriği çevrilmez.** Enum değerleri, kaydedilen randevu
   başlıkları, bildirim satırları, seed başlıkları. Görünen etiket ile
   saklanan değer ayrı şeyler.
5. **Sözlük dosyaları yalnızca yapı taşır.** Etiket sabiti kalmadı; geriye
   sıralı anahtar dizileri kaldı (`AGENT_ROLES`, `OFFER_STATUSES`,
   `NOTIFICATION_PREFERENCE_TYPES`…). "Hangi değerler var ve hangi sırayla"
   bir yapılandırma; ne yazdıkları içerik.
6. **Anahtar güvenliği iki katmanlı.** `types/i18n.d.ts` yanlış yazımı derleme
   zamanında yakalıyor; `messages.test.ts` `en.json`daki eksiği, boş değeri,
   eşleşmeyen yer tutucuyu ve saf katmandaki her değer listesinin sözlükte
   karşılığı olup olmadığını çalıştırma zamanında yakalıyor.

**Kapsam dışı kalan tek şey:** AI Asistan — o modül zaten daha önce
kaldırılmıştı.

---

## Demo hesabı — salt okunur erişim (Faz 28)

`demo@estateflow.app` uygulamanın tamamını **patron kadar geniş** görür ve
**hiçbir şey yazamaz**. Rol dördüncü bir `agents.role` değeri: `demo`.

### Neden `is_manager()` genişletilmedi

İlk akla gelen çözüm `is_manager()`i "veya demo" diye açmaktı. Yanlış olurdu:
politikaların çoğu `for all` ve o fonksiyon hem `using` (okuma) hem
`with check` (yazma) tarafında geçiyor — demoya yazma yetkisi de verirdi.

Aynı ayrım arayüz tarafında da yapıldı: `isManagerRole()` **yazma** kapılarında
kaldı, okuma kapıları yeni `canViewAll()` fonksiyonuna geçti. Tek bir yüklem
iki soruyu birden yanıtlayamıyordu.

### Üç katman, üç farklı iş

| Katman | Ne yapıyor | Olmasa ne olurdu |
| ------ | ---------- | ---------------- |
| **RLS** (`0013_demo_role.sql`) | `demo` için yalnızca SELECT politikaları; INSERT/UPDATE/DELETE için **hiçbir politika yok** ve RLS'in varsayılanı reddetmek | Arayüz kandırılabilirdi — istek doğrudan PostgREST'e atılır |
| **Server action** (`lib/actions/guard.ts`) | 31 yazma action'ının ilk satırında `denyIfReadOnly()` | Postgres `42501` dönerdi, kullanıcı "yetkiniz yok" görürdü — doğru ama eksik cümle |
| **Arayüz** (`components/demo/`) | Yazma sayfalarına giden bağlantılar yutuluyor, kalıcı bant + navbar rozeti | Kullanıcı formu doldurup en sonda reddedilirdi |

**Yazma yasağı bir kural yazarak değil, kural YAZMAYARAK kuruldu.** Unutulan
bir tablo demoya yazma değil, okuma bile vermez; hata güvenli tarafa düşüyor.

Sistem `pg_policies` üzerinden doğrulanabilir — bu sorgu **boş dönmeli**:

```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and qual like '%is_demo%' and cmd <> 'SELECT';
```

### Storage'da kapatılan gerçek açık

Yükleme kutuları server action'dan **geçmiyor** — tarayıcıdan doğrudan
Storage'a XHR atıyorlar, yani muhafız devreye girmiyordu. 0003 ve 0009'daki
yükleme politikaları da "giriş yapmış ve bir personel kaydına bağlı herkes"
diyordu; demo hesabı da bağlı bir personel. Yani **demo dosya
yükleyebiliyordu** — herkese açık bir hesapla herkese açık bir bucket'a.

0013 bu iki politikayı `and not is_demo()` ile yeniden kuruyor. Diğer rollerin
davranışı değişmiyor (`is_demo()` onlar için `false`). Bu, "sadece politika
ekle" kuralının tek bilinçli istisnası: izin veren bir kural zaten varken onu
daraltmadan kapatmak mümkün değil.

### Gizlemek yerine engelleyip anlatmak

Düğmeler yerinde duruyor ve tıklanabiliyor; tıklanınca "Bu bir demo hesabıdır"
bildirimi çıkıyor. Gerekçe: demo hesabının işi uygulamayı **göstermek**.
Gizlenen bir düğme, var olmayan bir özellik gibi okunur — tanıtım hesabı
tanıtacağı şeyi saklamış olurdu.

Tek istisna **giriş noktaları**: `/ilanlar/yeni` gibi form sayfaları demoya
kapalı (`ReadOnlyPageGuard`), personel davet diyaloğu açılmıyor. Formu
doldurduktan sonra reddedilmek bilgilendirme değil, zaman kaybı.

### Şifre neden migration'da değil

Migration dosyaları sürüm kontrolünde. Auth kullanıcısı Dashboard'dan **elle**
açılıyor — `0002`'deki test kullanıcısı deseninin aynısı; `0013` yalnızca
`agents` satırını kurup e-postayla eşleştiriyor.

Şifrenin kendisi `src/config/demo.ts` içinde ve **bu bilinçli bir istisna**:
giriş ekranındaki "Demo hesabıyla gör" düğmesi alanları dolduruyor, yani
tarayıcıya inen bir değer zaten gizli olamaz. Bunu sızıntı değil yayın yapan
şey hesabın kendisi — yazma yetkisi sıfır, sahip olduğu satır yok, ele
geçirilecek bir şeyi yok. **Projedeki başka hiçbir kimlik bilgisi kaynak koda
yazılmaz**; gerçek anahtarlar `.env.local` içinde.

Düğme otomatik giriş **yapmıyor**, sadece dolduruyor: ziyaretçi hangi hesapla
girdiğini görüyor ve "Giriş yap"a kendi basıyor.

### Periyodik sıfırlama gerekli mi

**Veri bütünlüğü için hayır.** Demo hiçbir satır yazamadığı için veri
kirlenmiyor; klasik "demo hesabını gece yarısı sıfırla" cron'una ihtiyaç yok.

**Tazelik için evet, ama seyrek.** `npm run seed` tarihleri çalıştığı ana göre
üretiyor: satış grafiği "son 12 ay", randevular "bu hafta". Seed'in üstünden
aylar geçerse takvim boşalır ve grafik sağa doğru düzleşir — veri bozulmaz ama
demo eskimiş görünür. **Üç ayda bir** yeniden çalıştırmak yeterli.

İki uyarı: seed **bütün tabloları siliyor**, yani gerçek veriyle paylaşılan bir
projede çalıştırılmamalı; ve `agents` tablosunu da sildiği için demo kaydını
kendisi yeniden kuruyor (`demoAgent`, `scripts/seed-supabase.ts`) —
`0013`'ü tekrar çalıştırmaya gerek yok, Auth bağı seed içinde yeniden kuruluyor.

---

## Performans (Faz 26)

### Nasıl ölçüldü

Next'in derleme sonunda bastığı **First Load JS** tablosu bu projede eksik
okunuyor: route grubu layout'unun parçalarını (`(app)/layout`) sayfalara
yazmıyor, oysa tarayıcı onları da indiriyor. Ölçüm bu yüzden
`app-build-manifest.json` üzerinden yapıldı — sayfanın, kök layout'un ve
`(app)` layout'unun parçaları birleştirilip her biri gzip'lendi.

Yöntem üretim sunucusunda doğrulandı: `/login` için hesap 267 kB dedi,
tarayıcının `performance` API'si 267.1 kB ölçtü (16 parça, TTFB 55 ms).

### En büyük üç bulgu

**1. Supabase istemcisi giriş yapmış HER sayfanın ilk yükündeydi — 65 kB gzip.**

Zincir tek satırdı: navbar → `lib/auth/client.ts` → `lib/supabase/client.ts` →
supabase-js. Navbar uygulama kabuğunun içinde, yani her sayfada. Kütüphanenin
tamamı sadece "Çıkış yap" düğmesi ve bildirim rozetinin Realtime aboneliği
için iniyordu — ikisi de ilk boyama için gereksiz, çünkü biri bir tıklamayı,
diğeri bir `useEffect`i bekliyor.

İki değişiklik:

- `signOut` kendi modülüne alındı (`lib/auth/sign-out.ts`) ve import'u
  fonksiyonun içine, dinamik hâle geçti. `lib/auth/client.ts` supabase-js'i
  statik import etmeye devam ediyor — giriş ekranı onu zaten kullanıyor.
- `useRealtimeInsert` kütüphaneyi efektin içinde `await import(...)` ile
  çekiyor. Tipler `typeof import(...)` ile türetiliyor, yani `Database` genel
  tipi korunuyor ve çalışma zamanına hiçbir şey sızmıyor.

| Sayfa | Önce | Sonra |
| ----- | ---- | ----- |
| `/dashboard` | 308 kB | **243 kB** |
| `/ayarlar` | 313 kB | **248 kB** |
| `/personeller` | 321 kB | **255 kB** |
| `/ilanlar/[id]` | 338 kB | **272 kB** |

Aynı etki Next'in kendi tablosunda dolaylı görünüyor: `/login`in kendi parçası
8.99 kB'den 74.6 kB'ye çıktı. Büyüyen bir şey yok — supabase-js paylaşılan
parçadan çıkıp yalnızca giriş ekranının parçasına taşındı.

**2. Dashboard ve personel detayı gereksiz ağ turu ödüyordu.**

Darboğaz sorgunun kendisi değil, İSTEK SAYISI: ölçüm `lib/data/stats.ts`
başlığında duruyor — 46 satır getirmek (146 ms) ile tek bir sayı getirmek
(183 ms) arasında fark yok, ikisi de bir gidiş-dönüş. Yavaş bir bağlantıda her
tur ~2 saniye sürüyordu (giriş turunda ölçüldü).

- `getSalesStats`: `offers` tablosuna iki ayrı sorgu vardı — biri bekleyenleri
  sayıyor, diğeri trend için `created_at` çekiyordu. Tek sorguya indi
  (`created_at, status`), iki sayı da aynı kümeden çıkıyor.
- `getAgentPerformance`: dört `head: true` sayımı (müşteri toplam/aktif, ilan
  toplam/aktif) iki dar sorguya indi.

Dashboard 11 → **10** tur, `/personeller/[id]` 5 → **3** tur. Çıktı bit bit
aynı; `countPerMonth` zaten yalnızca son 6 ayın kovalarını dolduruyor,
dolayısıyla kalkan tarih filtresi hiçbir sayıyı değiştirmiyor.

**3. İki rozet gereksiz yere istemci bileşeniydi.**

`ListingStatusBadge` ve `AgentRoleBadge` durum, olay ya da efekt içermiyor —
tek yaptıkları `useTranslations` çağırmak, o da sunucu bileşenlerinde de
çalışıyor. `"use client"` işareti kalktı; bileşenler artık İKİ TARAFLI:
sunucudan çağrıldıklarında tarayıcıya hiç inmiyorlar, istemciden
çağrıldıklarında (`agent-form`, `interest-card`) o sayfanın istemci parçasına
giriyorlar. Kazanç küçük ama yön doğru — ve yorumdaki "bu bir istemci
bileşeni olmak zorunda" gerekçesi yanlıştı.

### Bakılıp DEĞİŞTİRİLMEYENLER

| Ne | Bulgu |
| -- | ----- |
| N+1 sorgu | Yok. `getAgentPerformances` zaten üç geniş sorgu + bellekte gruplama; imzalı URL'ler `createSignedUrls` ile tek istekte. |
| `next/image` | Her kullanım `fill` + `sizes` taşıyor, galeride ilk kare `priority`. Storage önizlemeleri ve imzalı adresler bilerek düz `<img>` — gerekçeleri kendi dosyalarında. |
| Sayfaya özgü ağır kütüphane | Yok. Grafikler ve takvim elle yazılmış SVG/CSS; `zod` + `react-hook-form` (29 kB) yalnızca form route'larında. |
| `framer-motion` (39 kB) | Her sayfada, çünkü sayfa geçişi uygulama kabuğunda ve kartların çoğu onu kullanıyor. Geç yükleme ilk geçişi kırardı; `LazyMotion` + `m` göçü ~30 dosyaya dokunur. Bilinçli olarak ertelendi. |
| Gereksiz re-render | Bariz bir örnek çıkmadı: rozet sayıları context'ten geliyor ve sunucuda hesaplanıyor, Realtime geri çağrısı `ref`te tutuluyor (aboneliğin her render'da kapanıp açılmasını önlüyor). |

---

## Neden "mesajlaşma" değil "iş notu"

Faz 12'de `/mesajlar` iki panelli bir gelen kutusuydu: solda müşteri
konuşmaları, sağda sohbet balonları. Faz 18'de tamamen kaldırıldı.

**Sebep, sohbetin bir tarafının hiç var olmaması.** Müşteriler bu uygulamaya
girmiyor — girmeleri için bir hesap, bir davet akışı ve bir müşteri arayüzü
gerekirdi, hiçbiri yok. Yani danışman "gönder"e bastığında mesaj hiçbir yere
ulaşmıyordu. Şemanın kendi yorum satırı bunu zaten itiraf ediyordu:

> `sender_type` … Müşteri tarafında gerçek bir istemci YOK; `'customer'` yönü,
> gelen bir mesajın elle kaydedilmesi ve seed verisi için.

"Gelen mesajı elle kaydetmek" ise bir yazışma kopyalama işi. Sahada kimse
WhatsApp'tan gelen mesajı ikinci bir yere yazmaz. Sonuç, **görünen ama
işlemeyen bir özellikti** — projedeki en pahalı hata türü, çünkü demoda
çalışıyormuş gibi görünüyor.

**Yerine ne geldi.** Bir emlak ofisinde uygulama içinde gerçekten yürüyen
iletişim ekip içi olanı: "Ahmet Bey'in evrakları ne zaman gelecek", "bu
müşteriyi ben üstleniyorum", "fiyat konusunda esnek değil". Üçünün ortak
özelliği **bir kayda bağlı olmaları** — bir müşteriye ya da bir ilana. Bu
yüzden `work_notes` bir sohbet dizisi değil, kayda iliştirilmiş notlar kümesi:

| Tür | Ne işe yarıyor | Durumu |
| --- | -------------- | ------ |
| **Soru** | Cevap bekleyen bir talep | açık → çözüldü |
| **Atama** | Sorumluluk devri | açık → kabul edildi |
| **Not** | Ekibin bilmesi gereken bilgi | yok (takip edilmiyor) |

Genel notun durumu şemada `null` ve bu bir veritabanı kısıtıyla zorlanıyor
(`work_notes_status_matches_type`). "Ahmet Bey fiyatta esnek değil" notu
çözülecek bir şey değil, bir bilgi; ona zorla bir durum vermek panodaki
"Çözülmüş" sekmesini anlamsızlaştırırdı.

Aynı veri **iki bağlamda** görünüyor: `/mesajlar` panosu "hangi işler açık"
sorusunu, müşteri/ilan detayındaki "İş Notları" bölümü "bu kayıtla ilgili ne
konuşulmuş" sorusunu yanıtlıyor. Sidebar rozeti de anlam değiştirdi —
"okunmamış mesaj" değil, **sana yönelik açık iş** sayıyor. Notu okumak işi
bitirmiyor; kapatmak bitiriyor.

---

## Neden atama notu gerçekten sorumluyu değiştiriyor

`note_type = 'assignment'` bir not yazıldığında server action ilgili kaydın
`customers.assigned_agent_id` / `listings.agent_id` alanını **gerçekten**
güncelliyor.

Alternatif, atamayı bir metin olarak bırakmaktı — kolay ve zararsız görünüyor.
Zararsız değil: "Ahmet Bey'i ben üstleniyorum" yazan bir not, kayıt hâlâ eski
danışmanı gösterirken duruyorsa **yalan söylüyor**. İki ayrı doğruluk kaynağı
doğar; kaydın kendisi bir şey söyler, notlar başka bir şey. Bu tam olarak
kaldırılan `messages` tablosunun düştüğü hata.

Bu yüzden devir notun yan etkisi değil, **notun kendisi**: sıra önce devir,
sonra kayıt. Devir başarısız olursa hiçbir şey yazılmıyor — panoda
"üstleniyorum" diyen ama hiçbir şeyi değiştirmemiş bir not kalmasın.

Devralan, formda seçilen kişi; seçilmezse notu yazan. Yani tek form iki
senaryoyu karşılıyor: *"bunu sana veriyorum"* ve *"ben üstleniyorum"*. İkinci
durumda not **açık kalmıyor** — devir zaten oldu, kabul edecek kimse yok.
Birincisinde devralan "kabul et" diyene kadar açık duruyor.

Üç bildirim tetikleniyor: **eski** sorumluya (kayıt elinden çıktı), **yeni**
sorumluya (eline geçti) ve devri yapan kişiye — sonuncusu `notify()` tarafından
sessizce atlanıyor, çünkü kendi yaptığın işin bildirimi gürültüden başka bir
şey değil.

**İki RLS engeli aşılmak zorundaydı** ve ikisi de `0012_work_notes.sql` içinde
gerekçesiyle yazılı:

1. `customers_scoped` hem okuma hem yazma tarafında "sahibi ben olmalıyım"
   diyordu; `WITH CHECK` güncelleme *sonrası* satıra baktığı için bir danışman
   kendi müşterisini başkasına devredemiyordu. Yeni `customers_handoff`
   politikası dar: `USING` hâlâ "şu an sahibi benim", yalnızca `WITH CHECK`
   gevşiyor.
2. `notifications_write` yalnızca yöneticinin başkasına bildirim yazmasına izin
   veriyordu — yani @mention sadece yöneticiler için çalışırdı. Gevşetildi;
   asıl kapı zaten uygulamada, `notify()` bir server action değil.

---

## Bilinen sınırlar

Gizlenmiyor, sayılıyor: iki adımlı doğrulama, açık tema, API anahtarı
yönetimi, e-posta değiştirme, randevu hatırlatması, ofis bazlı kapsam ve
komisyon oranının satış anında dondurulması henüz yok. Her birinin nedeni
[docs/MIMARI.md](docs/MIMARI.md#henüz-yapılmayanlar) sonundaki listede.

*(Çoklu dil bu listeden Faz 25'te çıktı — arayüzün tamamı iki dilde.)*

**Eksik olanın DÜĞMESİ de yok (Faz 27).** Yapılmamış bir özelliğin yerinde
duran, tıklanınca hiçbir şey olmayan bir kontrol, eksiklikten daha kötü: sessiz
bir hata gibi görünüyor. Navbar'daki tema düğmesi ve profil menüsündeki
"Destek" öğesi bu yüzden kaldırıldı. Geriye kalan iki "yakında" işareti
(Ayarlar'daki iki adımlı doğrulama ve API anahtarları) bilinçli: ikisi de
rozetle işaretli ve yanlarında ne bekleneceğini anlatan bir cümle var —
söz veren bir alan ile sessizce ölü bir düğme aynı şey değil.
