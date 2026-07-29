# Emlak CRM

Gayrimenkul ofisleri için, sıfırdan yazılmış bir müşteri ve portföy yönetim
uygulaması. Next.js 15 App Router ve Supabase üzerine kurulu; rol bazlı
yetkilendirme, gerçek dosya yükleme ve canlı mesajlaşma dahil **on iki modülün
tamamı** uçtan uca çalışıyor — "yakında" ekranı kalmadı.

Türkçe arayüz, koyu tema, masaüstü + tablet + mobil.

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
| **Mesajlar** | İki panelli gelen kutusu, dosya eki, hazır şablonlar, **canlı** güncelleme |
| **Evraklar** | Tapu/kimlik/sözleşme arşivi; **private** depolama + süreli imzalı indirme |
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
| Canlı veri | Supabase Realtime — yalnızca mesajlar ve bildirimler |
| Arayüz | Tailwind CSS v4, shadcn/ui (Radix), framer-motion, lucide |
| Form | react-hook-form + zod |
| Test | Vitest — 239 test, 13 dosya |

Grafikler **kütüphanesiz**: SVG doğrudan üretiliyor (`lib/chart.ts`).
Takvimdeki sürükle-bırak da öyle — Pointer Events, ek bağımlılık yok.

---

## Kurulum

Gereksinim: **Node.js 20+** ve bir Supabase projesi (ücretsiz katman yeterli).

### 1. Klonlayın ve bağımlılıkları kurun

```bash
git clone <repo-url> emlak-crm && cd emlak-crm && npm install
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

`supabase/migrations/` altındaki **on bir dosyayı sırayla** Supabase Dashboard →
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

</details>

### 4. Demo veri

```bash
npm run seed
```

46 ilan, 64 müşteri, randevular, yazışmalar, evraklar ve bildirimler üretir —
her sayfa dolu açılır. Tarihler script'in çalıştığı ana göre üretilir, yani
demo hep taze görünür.

> ⚠️ Seed **mevcut kayıtları siler**. Kendi verinizle çalışıyorsanız
> çalıştırmayın.

### 5. Test kullanıcısı

Supabase Dashboard → **Authentication → Users → Add user** ile bir hesap açın,
sonra `0002_agents_auth_link.sql` içindeki e-postayı kendi hesabınızla
değiştirip o bölümü tekrar çalıştırın. Seed bağı korur.

### 6. Çalıştırın

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
- **Realtime.** `0008_messaging.sql` iki tabloyu `supabase_realtime` yayınına
  ekliyor. Üretim veritabanında bu migration çalışmadıysa mesajlar ve rozetler
  canlı güncellenmez — sayfa yenilenince doğru görünür, yani sessiz bir kayıp.
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
- **Rozetler saklanmıyor, hesaplanıyor.** Rozet zaten bir sorgu sonucu.
- **Gelirler ≠ Satışlar.** Aynı tablo, farklı soru: biri "hangi işlemler
  kapandı", diğeri "komisyonum tahsil edildi mi".

---

## Bilinen sınırlar

Gizlenmiyor, sayılıyor: iki adımlı doğrulama, açık tema, çoklu dil, API
anahtarı yönetimi, e-posta değiştirme, randevu hatırlatması, ofis bazlı kapsam
ve komisyon oranının satış anında dondurulması henüz yok. Her birinin nedeni
[docs/MIMARI.md](docs/MIMARI.md#henüz-yapılmayanlar) sonundaki listede.
