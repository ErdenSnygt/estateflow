# Mimari ve karar günlüğü

Bu belge, [README](../README.md)'nin özet geçtiği kararların **uzun hâli**:
her fazda ne yapıldığı, hangi alternatifin neden elenmediği ve nelerin
bilerek yapılmadığı.

Kurulum adımları README'de; burada yalnızca *neden* var.

---

- **Faz 1** — tasarım sistemi, layout iskeleti, route yapısı, giriş ekranı.
- **Faz 2** — İlanlar modülü uçtan uca (liste + filtre + detay + form),
  mock oturum koruması, tip ve veri erişim katmanı.
- **Faz 3** — Dashboard: KPI kartları, 12 aylık satış grafiği, portföy
  dağılımı ve aktivite akışı; veri katmanına toplu (aggregate) sorgular.
- **Faz 4** — Müşteriler modülü ve müşteri ↔ ilan ilişkisi; ESLint,
  ortak `seed.ts` / `search-params.ts` katmanları, mobil taşma düzeltmeleri.
- **Faz 5** — **Supabase**: gerçek şema + RLS, seed script, veri katmanının
  tamamının Supabase sorgularına göçü, formların kalıcı kaydı ve Supabase Auth
  (e-posta/şifre + Google + Apple).
- **Faz 6** — **Rol bazlı yetkilendirme + Personeller modülü**: `agents` ↔
  `auth.users` bağı, üç rollü RLS, şema generic'i, formlarda otomatik danışman
  ataması.
- **Faz 7** — **Supabase Storage**: gerçek fotoğraf yükleme (ilerleme, sıkıştırma,
  boyut/tip sınırı), yetim dosya temizliği, görüşme kaydı ekleme.
- **Faz 8** — **Teklifler + Satışlar** modülü (teklif→satış geçişi tek aksiyonda)
  ve **Vitest** ile saf fonksiyon test katmanı.
- **Faz 9** — **Mobil gezinme**: alt çubuk, menü ve filtre çekmeceleri, tablet
  ara kademesi.
- **Faz 10** — **Personel yönetimi**: davet (Auth Admin API), rol/prim
  düzenleme, pasifleştirme ve denetim kaydı.
- **Faz 11** — **Randevular (takvim)**: günlük/haftalık/aylık görünüm,
  kütüphanesiz sürükle-bırak, renk kodlu kategoriler ve tamamlanan randevunun
  müşteri çizelgesine otomatik işlenmesi.
- **Faz 12** — **Mesajlar + Evraklar + Bildirimler**: iki panelli mesaj
  merkezi (ek yükleme, hazır şablonlar), private bucket'ta belge arşivi
  (imzalı indirme), kişisel bildirim kutusu ve iki noktada Supabase Realtime.
- **Faz 13** — **AI Asistan kapsamdan çıkarıldı** (aşağıda).
- **Faz 14** — **Ayarlar + Profil**: profil/şifre/bildirim tercihleri, şirket
  bilgileri, kapak görselli profil sayfası ve hesaplanan rozetler.

- **Faz 16** — **Gelirler + Raporlar**: komisyon/tahsilat takibi ve mevcut
  verilerden görsel analiz özeti; menüde "yakında" ekranı kalmadı.
- **Faz 15** — **Cila ve yayına hazırlık**: tutarlılık denetimi, eksik
  iskelet/hata sınırları, bundle bölme, erişilebilirlik ölçümü, seed'in
  tamamlanması ve belgelerin ayrılması (aşağıda).
- **Faz 19** — **Görsel gerçekçiliği**: ilan fotoğrafları kategoriye göre elle
  seçildi (rastgele görsel servisi kaldırıldı), müşteri portreleri tamamen
  kalktı — arayüz baş harf gösteriyor (aşağıda).
- **Faz 18** — **Mesajlaşma → iş notları**: müşteri sohbeti kaldırıldı, yerine
  kayda bağlı ekip içi soru/atama/not modeli geldi; atama notu sorumluyu
  gerçekten devrediyor. Evraklar müşteri arama odaklı hâle geldi (aşağıda).

Uygulamada artık mock veri yoktur; her şey Supabase'den gelir. Yüklenen
fotoğraflar Supabase Storage'da durur.

## Gelirler ve Raporlar

Menüde kalan son iki "yakında" ekranı Faz 16'da dolduruldu.

### Gelirler ≠ Satışlar

İki modül **aynı `sales` tablosunu** okuyor ama farklı soru soruyor:

| | Satışlar (Faz 8) | Gelirler (Faz 16) |
| - | - | - |
| Soru | "Hangi işlemler kapandı" | "Komisyonum tahsil edildi mi" |
| Birim | Müşterinin ödediği bedel | Ofisin kazandığı pay |
| Zaman | Olay anı (`closed_at`) | Para akışı (tahsilat durumu) |
| Eylem | Teklif kabul → satış | Tahsilatı işaretle |

Aynı satır iki büyüklük taşıyor. Ayrı bir `commissions` tablosu açılmadı:
komisyon satışla bire bir ve tutarı `amount × commission_rate` ile
türetiliyor — ayrı tablo, her satışta ikinci bir satır yazmayı ve ikisini
senkron tutmayı gerektirirdi.

Eksik olan tek şey tahsilat durumuydu; `0011_commission.sql` onu
`sales.commission_status` olarak ekledi.

**Tutar saklanmıyor.** `commission_amount` diye bir kolon yok: tutar
türetilebilir ve saklamak, prim oranı değiştiğinde geçmiş kayıtların ne
olacağı sorusunu doğururdu. Bedeli kabul edildi ve açıkça yazılı: **oran
bugünkü oran**, satışın kapandığı andaki oran değil. Gerçek bir muhasebe
sisteminde oran satır bazında dondurulurdu; burada ofis tek ve oranlar
nadiren değişiyor.

**`overdue` elle işaretleniyor**, tarihten türetilmiyor. Otomatik gecikme
hesabı bir vade tarihi ister ("kapanıştan 30 gün sonra") ve o vade
sözleşmeden sözleşmeye değişiyor; uydurma bir sabit yerine karar yöneticide.

**Rol kontrolü uygulamada, RLS'te değil.** `sales_scoped` politikası bir
danışmanın kendi satış satırını güncellemesine izin veriyor — yani RLS tek
başına, danışmanın kendi komisyonunu "tahsil edildi" işaretlemesini
engellemiyor. Postgres kolon bazlı kısıt ifade edemediği için kapı
`lib/actions/revenue.ts`in ilk satırında. Aynı durumun üçüncü örneği
(diğerleri: `agents_self_update`, profil action'ı).

### Raporlar neden "hafif"

Google Analytics seviyesinde bir analitik **hedeflenmedi** ve bu bir eksiklik
değil, kapsam kararı: kohort analizi, huni, segment kırılımı gibi şeyler
uygulamanın topladığı veriden anlamlı biçimde çıkarılamaz. Burada **olay
takibi yok** — kimin hangi ilanı ne zaman görüntülediği tutulmuyor, yalnızca
kayıt durumları ve sayaçlar var. Bir huni çizmek için önce olay tablosu,
oturum kimliği ve zaman damgalı adımlar gerekirdi; o ayrı bir üründür.

Sayfa bunun yerine **mevcut fonksiyonların bir araya getirilmesi**:

| Bölüm | Kaynak | Fazı |
| ----- | ------ | ---- |
| Kategori / durum dağılımı | `getListingsByCategory`, `getListingsByStatus` | Faz 3 |
| Satış trendi | `getRevenueOverview` (aynı önbellekli sorgu) | Faz 16 |
| Ekip sıralaması | `getAgentPerformances` | Faz 6 |

Tek yeni sorgu `getTopListings` ve o da mevcut desende: dar `select`,
Postgres tarafında sıralama, `rows()` sarmalayıcısı. Satış trendi Gelirler
ile **aynı önbellekli satır kümesinden** besleniyor, yani bu sayfa için ayrı
bir satış serisi sorgusu açılmıyor.

Ekip performansı yalnızca yöneticiye görünüyor. Portföy ve satış bölümleri
herkese açık ama içerikleri RLS gereği zaten daralıyor — bir danışmanın
gördüğü sayılar kendi kayıtlarından geliyor.

## Faz 15 — cila geçişi

Son faz yeni özellik eklemedi; **on dört fazda biriken tutarsızlıkları**
ölçüp kapattı. Bulgular ve yapılanlar:

### Eksik olanlar tamamlandı

| Bulgu | Yapılan |
| ----- | ------- |
| Sekiz sayfada `loading.tsx` yoktu (geç eklenen modüller) | Ortak parçalar (`components/page-skeletons.tsx`) + sekiz dosya |
| Hiçbir route'ta `error.tsx` yoktu | `(app)/error.tsx` — tek dosya, tüm sayfalar |
| Satışlar/Teklifler/Randevular "filtre boş" ile "veri yok"u ayırmıyordu | Üçünde de iki ayrı metin |
| Kart hover'ında yukarı kalkma yoktu | `surface-card-interactive` utility'sine tek yerden eklendi |
| Navbar tema düğmesinin erişilebilir ismi yoktu | `aria-label` |

Hata sınırı **grup segmentine** (`(app)/error.tsx`) kondu, on üç sayfaya
ayrı ayrı değil: kullanıcı için hepsi aynı durum ve tek dosya on üç kez
güncellenmekten iyi. `layout.tsx` sınırın dışında kalıyor, yani hata anında
sidebar ve navbar çizilmeye devam ediyor — kullanıcı gezinebiliyor.

### Sayaç animasyonu: karar

`useCountUp` yalnızca **Dashboard KPI kartlarında** kalıyor; Personeller,
Satışlar ve Evraklar'daki sayılara yayılmadı. Gerekçe üç maddede
`hooks/use-count-up.ts` başlığında, özeti: sayaç bir *karşılama* efekti,
liste sayıları ise *okunacak veri* — ve liste sayıları filtreyle değiştiği
için her filtre denemesinde yeniden koşardı. Kural: **sayfa başına en fazla
bir grup, ve o grup sayfanın konusu olmalı.**

### Bundle: ölçüldü, sonra bölündü

Build çıktısındaki en büyük sayfalar 265 kB'daydı (form sayfaları). Chunk'lar
taranınca kaynak bulundu: `@supabase/supabase-js` tek parça hâlinde **184 kB**
ve yükleme modülleri onu **statik** import ediyordu — yani form sayfası
açılırken indiriliyordu, kullanıcı hiç fotoğraf seçmese bile.

`upload.ts` ve `upload-document.ts` içinde istemci **dinamik import**'a
çevrildi; artık dosya seçildiği anda yükleniyor (kullanıcı zaten bir yükleme
bekliyor, ek gecikme fark edilmiyor).

| Route | Önce | Sonra |
| ----- | ---- | ----- |
| `/ilanlar/yeni`, `/ilanlar/[id]/duzenle` | 265 kB | **200 kB** |
| `/musteriler/yeni`, `/musteriler/[id]/duzenle` | 263 kB | **197 kB** |
| `/evraklar` | 242 kB | **177 kB** |
| `/personeller/[id]/duzenle` | 231 kB | **166 kB** |

`/mesajlar` (230 kB) ve `/login` (229 kB) bölünmedi: ikisi de Supabase
istemcisini **açılışta** gerçekten kullanıyor — biri realtime aboneliği için,
diğeri giriş için. Ertelemek sahte bir kazanç olurdu.

### Erişilebilirlik: kontrast ölçüldü

Renk token'ları WCAG oranıyla hesaplandı:

| Token | Oran (surface üstünde) | AA (4.5:1) |
| ----- | ---------------------- | ---------- |
| `--text` | 14.7 | ✅ |
| `--text-secondary` | 6.8 | ✅ |
| `--text-muted` (eski `#626e85`) | **3.4** | ❌ |
| `--brand` | 4.7 | ✅ |
| `--brand-foreground` / `--brand` | **3.7** | ❌ |

`--text-muted` düzeltildi: aynı ton (219°) ve doygunluk korunarak açıklığı
yükseltildi (`#8691a6`). Yeni değer yüzey merdiveninin **tamamında** geçiyor
(canvas 6.0 → active 4.5) ve hiyerarşi bozulmadı — secondary hâlâ belirgin
şekilde daha açık.

**Düzeltilmeyen:** beyaz metin `--brand` zemin üzerinde 3.7:1. Bu, birincil
butonların etiketi ve düzeltmek `--brand`'ı koyulaştırmayı gerektiriyor —
ama aynı renk *metin* olarak da kullanılıyor (4.7:1, zaten sınırda) ve
koyulaştırmak onu AA'nın altına indirirdi. Doğru çözüm buton dolgusu için
ayrı bir token açmak; marka rengini değiştiren bir tasarım kararı olduğu
için **kullanıcıya bırakıldı**.

Form alanları temiz çıktı: `Input`'ların hepsi `FormField`/`FormControl`
içinde ve shadcn katmanı `id`/`htmlFor`/`aria-describedby`/`aria-invalid`
bağlarını otomatik kuruyor.

### Seed tamamlandı

Seed yalnızca Faz 5'teki sekiz tabloyu dolduruyordu; Faz 11–14'te gelen altı
tablo boştu — yani demo'yu izleyen biri **dört sayfayı bomboş** görüyordu.
Eklenenler: randevular (geçmiş/gelecek üç haftaya yayılı), konuşmalar ve
mesajlar (bir kısmı okunmamış), evraklar, bildirimler ve şirket ayarları.

Evraklarda bir ayrıntı: seed private bucket'a **gerçek PDF yüklüyor**.
Var olmayan yollara işaret eden satırlar listeyi dolu gösterirdi ama her
indirme denemesi hataya düşerdi — demo'da en çok göze batacak şey de bu
olurdu.


## Çalıştırma

```bash
npm run dev
```

Kontroller: `npm run typecheck` · `npm run lint` · `npm test` · `npm run build`

Uygulama `http://localhost:3000` adresinde açılır ve `/login` ekranına yönlenir.

> **Dev server çalışırken `npm run build` çalıştırmayın.** İkisi de aynı `.next/`
> klasörünü kullanır; build, dev server'ın manifest ve chunk'larını ezer. Belirti
> kafa karıştırıcıdır: sayfa tamamen boş görünür, CSS dosyası 404 döner ve
> terminalde `__webpack_modules__[moduleId] is not a function` hatası çıkar.
> Kurtarma: dev server'ı durdurun, `.next` klasörünü silin, yeniden başlatın.

## Teknoloji

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui (new-york) · Radix UI · Framer Motion · next-themes · Lucide ·
react-hook-form + zod · Sonner · **Supabase (`@supabase/supabase-js` +
`@supabase/ssr`)**

> **Not:** TypeScript 5.x'e sabitlenmiştir. TypeScript 7 (native derleyici)
> Next.js 15.5 ile uyumsuz — `tsconfig` path alias'ları sessizce çalışmaz.

> **Not:** `@hookform/resolvers` kullanılmayan bir `valibot` sürümüyle peer
> çakışması üretir; bu paket `--legacy-peer-deps` ile kurulmuştur.

## Klasör yapısı

```
supabase/migrations/        # ★ Şema, index, trigger, RLS politikaları
scripts/seed-supabase.ts    # ★ Demo veri üretimi (npm run seed)
src/
├── middleware.ts           # ★ Supabase oturum koruması + jeton tazeleme
├── app/
│   ├── (app)/              # Sidebar + navbar iskeletini paylaşan sayfalar
│   │   ├── layout.tsx      # Oturumu çözer, AppShell'e verir
│   │   ├── dashboard/      # KPI + grafikler + aktivite akışı
│   │   ├── musteriler/     # Liste + detay + yeni/düzenle formları
│   │   ├── ilanlar/        # ★ Referans modül (liste, detay, form, silme)
│   │   ├── personeller/    # ★ Ekip listesi + detay (yalnızca yöneticiler)
│   │   ├── satislar/       # ★ Kapanan satışlar + teklifler sekmesi
│   │   ├── randevular/     # ★ Takvim: gün / hafta / ay + sürükle-bırak
│   │   ├── mesajlar/       # ★ İki panelli mesaj merkezi (Realtime)
│   │   ├── evraklar/       # ★ Belge arşivi (private bucket + imzalı URL)
│   │   ├── bildirimler/    # ★ Kişisel gelen kutusu
│   │   ├── ayarlar/        # ★ Profil, şifre, tercihler, şirket
│   │   ├── profil/         # ★ Kapak + istatistik + rozetler
│   │   ├── gelirler/       # ★ Komisyon ve tahsilat
│   │   └── raporlar/       # ★ Portföy / satış / ekip analizi
│   ├── auth/callback/      # ★ OAuth kodunu oturuma çeviren route handler
│   ├── login/              # Kabuk dışı, tam ekran giriş
│   ├── layout.tsx          # Root: Inter fontu, metadata, Providers
│   └── globals.css         # ★ Tasarım sisteminin tamamı
├── components/
│   ├── ui/                 # shadcn primitives
│   ├── layout/             # AppShell, Sidebar, Navbar, SessionProvider…
│   ├── dashboard/          # KPI kartı, satış grafiği, halka grafik, akış
│   ├── listings/           # İlan kartı, filtre çubuğu, galeri, form…
│   ├── customers/          # Müşteri kartı, timeline, form…
│   ├── agents/             # ★ Personel kartı, rol rozeti, yetki kapısı,
│   │                       #   AgentField (iki formun ortak danışman alanı)
│   ├── appointments/       # ★ Takvim kabuğu, saatlik ızgara, ay ızgarası,
│   │                       #   randevu paneli ve formu
│   ├── storage/            # ★ AvatarUpload — müşteri + personel portresi
│   └── auth/               # LoginForm, sağlayıcı işaretleri, arka plan
├── config/navigation.ts    # ★ Menü / route / başlık tek kaynağı
├── types/
│   ├── supabase.ts         # ★ Şema tipleri — gen types biçiminde, generic
│   └── database.ts         # ★ Uygulama adları (Listing, Customer, Agent…)
└── lib/
    ├── supabase/
    │   ├── client.ts       # ★ Tarayıcı istemcisi (giriş / OAuth)
    │   ├── server.ts       # ★ Sunucu istemcisi (her istekte yeniden)
    │   └── env.ts          # Ortam değişkeni okuma + anlaşılır hata
    ├── storage/
    │   ├── paths.ts        # ★ Adres şeması, boyut/tip sınırları (iki taraflı)
    │   ├── upload.ts       # ★ Sıkıştırma + XHR yükleme (yalnızca tarayıcı)
    │   └── cleanup.ts      # ★ Yetim dosya temizliği (yalnızca sunucu)
    ├── auth/
    │   ├── session.ts      # ★ Edge-safe oturum + jeton tazeleme
    │   ├── server.ts       # ★ getSession / getCurrentAgent / getManagerAgent
    │   └── client.ts       # signInWithPassword / signInWithProvider / signOut
    ├── actions/            # ★ Server action'lar (ilan + müşteri yazma)
    ├── data/               # ★ Okuma katmanı — tüm Supabase sorguları
    │   ├── query.ts        # rows/maybeRow/counted + arama temizleme
    │   ├── stats.ts        # StatMetric, yüzde değişim, aya göre sayım
    │   ├── agents.ts       # ★ Personel + performans / prim toplamları
    │   ├── sales.ts        # ★ Satış + teklif listeleri, 12 aylık seri, KPI
    │   ├── listings.ts     # İlan sorguları + dashboard aggregate'leri
    │   ├── customers.ts    # Müşteriler + ilişki + timeline
    │   ├── appointments.ts # ★ Takvim aralık sorgusu + mini listeler
    │   └── activity.ts     # İki alanı birden kapsayan aktivite akışı
    ├── search-params.ts    # ★ URL filtre ayrıştırıcıları (ortak)
    ├── listings.ts         # İlan etiket / seçenek sözlüğü
    ├── customers.ts        # Müşteri etiket / seçenek sözlüğü
    ├── agents.ts           # ★ Rol etiketleri + yetki soruları (istemci-güvenli)
    ├── offers.ts           # ★ Teklif etiketleri + DURUM GEÇİŞ KURALLARI (saf)
    ├── appointments.ts     # ★ Randevu sözlüğü + durum ve çizelge kuralları (saf)
    ├── calendar.ts         # ★ Takvim matematiği — sabit UTC+3, saf ve testli
    ├── device.ts           # ★ İstek başlıklarından cihaz tahmini (tek kullanım)
    ├── listings-schema.ts  # zod form şeması
    ├── customers-schema.ts # zod form şeması
    ├── chart.ts            # SVG path / ölçek yardımcıları (kütüphanesiz)
    └── format.ts           # Para, tarih, alan biçimlendiricileri
```

## Veritabanı

### Tablo ↔ fonksiyon eşlemesi

Faz 4'e kadar bu fonksiyonlar `src/lib/data/` içinde bellekte üretilen
dizileri filtreliyordu. Faz 5'te **imzaları değişmeden** Supabase sorgularına
dönüştüler; çağıran hiçbir sayfa veya bileşen değişmedi.

| Tablo | Okuyan fonksiyon(lar) | Sorgu |
| ----- | --------------------- | ----- |
| `agents` | `getAgents` · `getAgentById` · `getAgentOptions` | düz select |
| `agents` + `listings` + `customers` + `sales` | `getAgentPerformance(id)` | 4 × `head: true` sayım + satış tutarları |
| `agents` + `listings` + `customers` + `sales` | `getAgentPerformances(agents)` | 3 geniş select + JS gruplama (liste sayfası) |
| `listings` | `getListings` · `getListingById` · `getRelatedListings` | filtre + sıralama |
| `listings` | `getListingsByCategory` · `getListingsByStatus` · `getPortfolioTotals` | tek kolon select + JS gruplama |
| `customers` | `getCustomers` | `select("*, interests:customer_listing_interests(count)")` |
| `customers` | `getCustomerById` | `select("*, agent:agents(*), interests:customer_listing_interests(intent, listing:listings(*))")` |
| `customers` | `getCustomerCount` · `getCustomerStats` · `getCustomersByStatus` | `count: exact, head: true` + trend için `created_at` |
| `customer_listing_interests` | `getInterestedCustomers` | `select("customer:customers(*)").eq("listing_id", …)` |
| `customer_timeline_events` | `getCustomerTimeline` | takma adlı select (aşağıya bakın) |
| `activity_log` | `getRecentActivity` | `select("…, actor:agents(full_name)")` + `order` + `limit` |
| `sales` | `getSalesTimeSeries` · `getSalesStats` | son 12 ay + aya göre gruplama |
| `sales` | `getSalesList` · `getAgentSalesTotal` | tarih/danışman filtresi + gömme |
| `offers` | `getSalesStats` (Bekleyen Teklif) | `eq("status","pending")` sayımı |
| `offers` | `getOffersList` | durum/danışman filtresi + ilan & müşteri gömme |
| `appointments` | `getAppointments(range, filters)` | `gte`/`lt` tarih aralığı + müşteri, ilan, danışman gömme |
| `appointments` | `getUpcomingAppointmentsForCustomer` · `getAppointmentsForListing` · `getTodayAppointments` | ilişki filtresi + `limit` (detay sayfalarının mini listeleri) |

**Takma adlar.** `customer_timeline_events` tablosunda kolonlar
`event_type` / `description` / `occurred_at`; sorgu bunları PostgREST takma
adlarıyla (`type:event_type`) `CustomerEvent` şekline çeviriyor. Böylece kolon
adları veritabanı diline, tip adları arayüz diline sadık kalıyor ve
`CustomerTimeline` bileşeni Faz 4'ten beri hiç değişmedi.

### Brief'te olmayan iki tablo: `sales` ve `offers`

Faz 5 briefi altı tablo sayıyordu. İkisi eklendi, çünkü fazın iki kuralı
aksi hâlde çarpışıyordu — "hiçbir mock veri kalmasın" ve "demo veri
kaybolmasın":

| KPI / grafik | Faz 4'teki kaynağı | Faz 5'teki kaynağı |
| ------------ | ------------------ | ------------------ |
| 12 aylık satış grafiği, "Bu Ay Satış" | kodda üretilen bağımsız mock seri | `sales` tablosu |
| "Bekleyen Teklif" | `MOCK_PENDING_OFFERS = 14` sabiti + uydurma trend | `offers` tablosu |

Satışı `listings.status = 'satildi'` üzerinden türetmek seçenek değildi: 46
kayıtlık portföyde yalnızca 6 satış var ve bu 12 aylık bir grafiği taşımaz.
Kapanan işlem zaten ilandan ayrı bir olgudur — aynı ilan yıllar içinde birden
çok kez el değiştirebilir.

### `intent` — kiralık ilanların müşterisi

`customer_listing_interests.intent` (`purchase` | `rent`) Faz 5'te eklendi.
Faz 4'te eşleşme `budget_min/max` aritmetiğiyle kuruluyordu ve bu bir **satın
alma** bütçesi olduğu için kiralık ilanlar hiçbir müşteriyle eşleşemiyordu;
zorlandığında "₺24 Mn bütçeli alıcı ₺178 B/ay daireyle ilgileniyor" gibi
satırlar çıkıyordu. Niyet artık ilişkinin kendisinde durduğu için ilan
detayındaki "İlgilenen Müşteriler" kartı kiralıklarda da doğru çalışıyor.

### Birincil anahtarlar metin

`iln-1001`, `mst-2001`, `agt-1` gibi okunabilir kodlar arayüzde gösteriliyor
("İlan no: ILN-1001") ve URL'lerde duruyor; uuid'e geçmek demoyu görünür
biçimde fakirleştirirdi. Yeni kayıtların kodunu iki Postgres dizisi üretir
(`listing_id_seq`, `customer_id_seq`) — uygulama tarafında id kurgulanmaz,
eşzamanlı iki kayıt aynı numarayı alamaz.

### Yetkilendirme: roller ve RLS

Faz 5'te politikalar tek satırdı — `for all to authenticated using (true)`,
yani giriş yapan herkes her şeyi görüyordu. Faz 6'da hepsi
[`0002_agents_auth_link.sql`](supabase/migrations/0002_agents_auth_link.sql)
ile değiştirildi.

#### Rol modeli neden bu üç seviye

`agents.role` üç değer alır: **`patron`**, **`ofis_muduru`**, **`danisman`**.
Bunlar teknik izin adları değil, bir emlak ofisinin gerçek hiyerarşisi —
kullanıcı "bu kişi ofis müdürü mü?" sorusunu sorabiliyorsa rol modeli doğru
seviyededir. Alternatif iki yaklaşım bilinçle elendi:

- **İzin bazlı (`can_edit_listings`, `can_view_reports`…)** — daha esnek ama
  altı kişilik bir ofiste yönetilemez hale gelir; her yeni ekran yeni bir
  bayrak ister ve kimsenin hangi bayrak setine sahip olduğu bilinmez.
- **İki seviye (yönetici / kullanıcı)** — bugün yeterdi ama ofis müdürü
  kavramını dışarıda bırakırdı, oysa müşterinin organizasyonunda bu rol var ve
  ileride patrondan ayrışacak.

Üç seviye, kapsamı **tek bir kolonla** ifade edebilecek kadar kaba, gerçek
organizasyonu yansıtacak kadar da ince.

`agents` tablosunda **iki ayrı "rol" alanı** olduğuna dikkat edin:

| Kolon | Ne | Kim okur |
| ----- | -- | -------- |
| `title` | Görünen unvan ("Kıdemli Portföy Danışmanı") — serbest metin | Yalnızca arayüz |
| `role` | Yetki rolü — kapalı küme | RLS politikaları + arayüz rozetleri |

Faz 5'teki `role` kolonu unvandı; 0002 onu `title`'a taşıyıp adı yetki rolüne
verdi. İkisi tek kolonda duramazdı: unvanı düzenlemek yetki değiştirmek
anlamına gelirdi.

#### Kimin ne gördüğü

| Rol | İlanlar & müşteriler | Personeller modülü | Personel düzenleme |
| --- | -------------------- | ------------------ | ------------------ |
| `patron` | Tümü | Görür | Yapabilir |
| `ofis_muduru` | Tümü | Görür | Yapabilir |
| `danisman` | Yalnızca kendine atanmış olanlar | **Göremez** | Hayır (kendi kaydını yalnızca okur) |

Kapsam `listings.agent_id` ve `customers.assigned_agent_id` üzerinden kurulur;
`sales`, `offers`, `activity_log` aynı mantıkla, ilişki ve timeline tabloları da
bağlı oldukları kayıt üzerinden. Yani bir danışman için dashboard KPI'ları da
kendi rakamlarını gösterir — bu bir yan etki değil, istenen davranış.

Üç şey bilinçli:

1. **`anon` rolünün hiçbir politikası yok.** RLS açıkken politikası olmayan rol
   erişemez; giriş yapmamış bir ziyaretçi publishable anahtarla veriye ulaşamaz.
2. **Bağlanmamış kullanıcı hiçbir şey görmez.** `current_agent_id()` null
   döner, `x = null` da null — politika için "hayır". Uygulama bu boşluğu
   `AgentNotice` uyarısıyla açıklar.
3. **Yardımcı fonksiyonlar `security definer`.** `agents` üzerindeki politika
   rolü öğrenmek için yine `agents`'ı okur; normal bir fonksiyon bunu yapsaydı
   Postgres *"infinite recursion detected in policy"* derdi.

#### `ofis_muduru` neden şu an patronla aynı

Çünkü veri modelinde henüz **ofis diye bir şey yok** — ne `offices` tablosu var
ne de `agents.office_id`. "Kendi ofisinin her şeyi" ifadesini bugün doğru
hesaplayacak bir alan bulunmuyor. Uydurulmuş bir kapsam (ör. "kendisi + kendi
oluşturduğu danışmanlar") yanlış bir güvenlik hissi verirdi; onun yerine bilinen
bir kapsam veriliyor ve fark açıkça belgeleniyor.

**Ayrıştırma noktası tek bir fonksiyon:** `public.is_manager()`. `office_id`
eklendiğinde ikiye bölünür —

```sql
is_owner()      -> current_agent_role() = 'patron'
same_office(x)  -> current_agent_role() = 'ofis_muduru'
                   and x = current_agent_office()
```

— ve politikalardaki `is_manager()` çağrıları `is_owner() or same_office(agent_id)`
biçimini alır. Tablo politikalarının geri kalanına dokunulmaz. Arayüz tarafında
karşılığı `lib/agents.ts` içindeki `isManagerRole()`.

#### `commission_rate` — basit tutuldu

Prim tek satırlık bir çarpımdır:

```
prim = (ay içinde kapanan satışların toplamı) × agents.commission_rate
```

Oran personel başına saklanır (`double precision`, 0–1 arası; para değil
katsayı olduğu için `numeric` tercih edilmedi). Gerçek prim mantığının
gerektirdiği hiçbir şey **yok**: kademeli oranlar (hedefi aşınca yükselen
yüzde), ofis/danışman payı ayrımı, KDV ve stopaj, ekip başına bölüşüm,
hakediş–tahsilat farkı, avans mahsubu.

Bunlar eklenmedi çünkü hepsi **ofise göre değişir** ve doğru modeli tahmin
etmek yerine görünür bir sayı üretip yerini işaretlemek daha dürüst. Genişletme
yolu da buna göre açık: hesap tek yerde, `getAgentPerformance()` içinde
(`lib/data/agents.ts`). Kademeli bir yapıya geçildiğinde `commission_rate`
kolonu bir `commission_tiers` tablosuna dönüşür ve bu fonksiyonun gövdesi
değişir — çağıran kart ve detay sayfası aynı `monthlyCommission` alanını
okumaya devam eder.

## Satışlar ve teklifler

Zincirin son iki halkası: ilgi → görüşme → **teklif → satış**. Faz 8'e kadar
`offers` ve `sales` tablolarına yalnızca seed yazıyordu; dashboard'ın
"Bu Ay Satış" ve "Bekleyen Teklif" kartları gerçek tabloları okuyor ama o
tablolara arayüzden tek satır eklenemiyordu.

> **Düzeltme:** bu iki sayı Faz 5'ten beri mock DEĞİLDİ — `sales` ve `offers`
> tabloları o fazda açılmış ve `getListingStats()` onları gerçekten okuyordu.
> Faz 8'de değişen şey verinin kaynağı değil, **arayüzden üretilebilir hale
> gelmesi**. Sorgular ayrıca `data/listings.ts`ten `data/sales.ts`e taşındı;
> ilan sayımlarıyla satış cirosunun aynı fonksiyonda durması Faz 3'ten kalma
> bir geçiciydi.

### `agent_id` ve prim: her zaman ilan sahibine

Ne teklifte ne satışta danışman elle seçiliyor; ikisi de `listings.agent_id`'den
okunuyor ve istemciden gelen bir danışman kimliğine **güvenilmiyor**.

**"Kim kapattı" ayrı bir kavram olarak tutulmuyor.** Bir ofis müdürü danışmanın
tatilde olduğu gün gelen teklifi kabul ettiğinde prim müdüre geçmemeli —
portföyü kuran, müşteriyi getiren, ilanı takip eden danışmandır. Alternatif
(`closed_by` diye ikinci bir kolon) hemen "prim hangisine bakacak?" sorusunu
doğurur ve o soru ofise göre değişir. Tek kaynak, tek cevap.

Sonucu: `getAgentPerformance()` içindeki prim çarpımı hiç değişmedi, sadece
altındaki `sales` tablosu artık gerçekten doluyor.

### Teklif kabulü neden tek aksiyon

"Kabul et" kullanıcı için tek bir karardır; arkasındaki beş yazma bir uygulama
detayıdır:

1. Teklifin durumu `accepted` olur
2. `sales` satırı oluşur (tutar teklifden, `agent_id` ilandan)
3. İlan `satildi` durumuna geçer
4. Aynı ilandaki **diğer bekleyen teklifler** `expired` olur — ilan satıldı,
   onlar reddedilmedi, konusuz kaldı
5. `activity_log`'a `sale_closed`, müşterinin çizelgesine `purchased` düşer

Teklif OLUŞTURULDUĞUNDA da iki kayıt düşer: `activity_log`'a `offer_received`,
müşterinin görüşme geçmişine `offer_sent`. İkincisi baştan atlanmıştı — çizelge
seed verisinde "Teklif gönderildi" satırlarını gösterirken arayüzden oluşturulan
teklif oraya hiç yazılmıyordu, yani çizelge gerçeğin yarısını anlatıyordu.
Teklif vermek aynı zamanda bir müşteri teması olduğu için `last_contact_at` de
güncelleniyor.

Arayüzde beş adım olsaydı her adım yarıda kalabilir ve "kabul edilmiş ama
satılmamış ilan" gibi tutarsız durumlar ekranda görünürdü.

**Tam atomik değil ve bu bilinçli.** PostgREST üzerinden çok tablolu
transaction açılamıyor. Sıralama en kritik yazma önce olacak şekilde seçildi:
teklif güncellemesinin koşulunda `status = 'pending'` var, yani iki sekmede
birden kabul edilirse ikincisi hiçbir satır güncelleyemez ve yan etkiler hiç
başlamaz — **çift satış imkânsız**. Sonraki adımlardan biri düşerse teklif
kabul edilmiş ama satış yazılmamış olur; bu, tersinin aksine kullanıcıya
görünür ve elle düzeltilebilir bir durum.

### Bir çift için tek bekleyen teklif

Aynı müşterinin aynı ilana aynı anda iki açık teklifi olamaz. Hangisinin
geçerli olduğu belirsiz kalır ve biri kabul edilince diğeri "ilan satıldı" diye
kapanır — kullanıcının hiç istemediği bir sonuç.

Kural iki katmanda: server action önce mevcut bekleyen teklifi arayıp
**ne yapılması gerektiğini söyleyen** bir mesaj döndürüyor ("önce eskisini
yanıtlayın ya da süresi doldu olarak işaretleyin"), kısmi unique indeks ise
yarış durumunu kapatıyor. Aynı gerekçeyle teklif kabulünde de
`status = 'pending'` koşulu var; birinde veritabanı garantisi olup diğerinde
olmaması tutarsız kalırdı.

**Sessizce eski teklifi kapatmak seçilmedi.** "Müşteri teklifini yükseltti"
senaryosunda otomatik devretmek cazip ama kullanıcının istemediği bir veri
değişikliği, açık bir hata mesajından kötüdür. Yükseltme bir tıklama fazladan:
eskisini kapat, yenisini gir.

İndeks **kısmi** — yalnızca `pending` satırları kapsıyor. Tam bir unique kısıt,
geçmişte reddedilmiş bir teklifin ardından yeniden teklif verilmesini de
engellerdi; teklif geçmişi tutulmalı.

**Geçişler tek yönlü ve terminal.** Yalnızca `pending` bir şeye dönüşebilir;
kabul edilmiş bir teklifi geri almak satış satırını ve ilanın durumunu da geri
almayı gerektirir — sessizce yapılamayacak bir şey. Kural tablosu
[`lib/offers.ts`](src/lib/offers.ts) içinde saf bir fonksiyon: arayüz hangi
düğmeleri çizeceğine, server action geçişin geçerli olup olmadığına **aynı**
kaynağa bakarak karar veriyor.

## Ayarlar ve Profil

Projenin son modülü. `/ayarlar` yedi bölümden oluşuyor (profil, şifre, 2FA,
bildirim tercihleri, görünüm/dil, şirket, API anahtarları); `/profil` ise
kapak görseli, performans özeti ve rozetleri gösteriyor.

| Dosya | İş |
| ----- | -- |
| [`lib/notification-preferences.ts`](src/lib/notification-preferences.ts) | jsonb → güvenli tercih nesnesi; saf, testli |
| [`lib/badges.ts`](src/lib/badges.ts) | Rozet kuralları — saf fonksiyon, sorgu açmıyor |
| [`lib/actions/profile.ts`](src/lib/actions/profile.ts) | Kendi kaydını düzenleme, şifre değiştirme |
| [`lib/actions/company.ts`](src/lib/actions/company.ts) | Şirket ayarları (yönetici) |
| [`components/settings/`](src/components/settings) | Bölüm kabuğu ve formlar |

### `notification_preferences` nasıl kontrol ediliyor

Tercih `agents` tablosunda tek bir **jsonb** kolonu — ayrı bir tablo değil.
Tercihler her zaman toplu okunuyor ve toplu yazılıyor (tek kullanıcının tek
formu); ayrı tablo, her bildirim yazımına bir join ve her form kaydına beş
upsert eklerdi.

Bedeli açık: **jsonb'nin içeriğini veritabanı denetlemiyor.** Bu yüzden okuma
tarafı ham değere hiç güvenmiyor — `parseNotificationPreferences()` eksik,
fazla ve yanlış tipli anahtarları varsayılana düşürüyor; yazma tarafı
(`serializeNotificationPreferences()`) bilinmeyen anahtarları atıyor, yani
istemciden gelen bir gövde kolona istediğini ekleyemiyor.

Kontrol **tek noktada**: `lib/actions/notify.ts`. Faz 12'deki dört tetikleyici
(yeni müşteri, yeni ilan, satış kapanışı, yeni randevu/mesaj) zaten hepsi bu
yardımcıdan geçiyordu, dolayısıyla tercih kontrolü de tek yere eklendi:

```
notify() →  hedef kendisi mi?        → evet ise yazma
        →   tercihi kapalı mı?       → evet ise yazma
        →   satırı aç
```

Kapalı bir tür için satır **hiç oluşturulmuyor**. "Yaz ama gösterme"
seçilmedi: kullanıcı tercihi sonradan açtığında geçmişteki tüm bildirimler
birden belirirdi.

Bir yön kararı daha var ve önemli: **tercih okunamazsa bildirim yazılıyor.**
Satır yoksa, kolon henüz eklenmemişse ya da sorgu düşerse susmak yerine
geçiriyoruz. Fazladan bir bildirim fark edilir ve kapatılır; eksik bildirim
fark edilmez — kimse gelmeyen bildirimi aramaz.

### Dil ve açık tema neden placeholder

İkisi de navbar'da Faz 1'den beri duran ama hiçbir şey yapmayan kontrollerdi.
Faz 14'te Ayarlar'a taşındılar ve **hâlâ çalışmıyorlar** — ama artık nedenini
söylüyorlar.

**Açık tema.** `globals.css` içindeki token'lar koyu zeminde ayırt edilebilir
olacak şekilde seçildi: yüzey merdiveni (`--canvas` → `--surface-active`),
`--border` gibi yarı saydam kenarlıklar ve beş renkli grafik paleti. Açık tema
bunların **tamamının ikinci bir setini** istiyor; yarısını çevirmek kontrastı
bozuk bir arayüz üretir. Altyapı hazır duruyor (`@custom-variant light`),
`forcedTheme` kaldırılmadı — çünkü kaldırmak, çalışmayan bir geçişi açmak
olurdu.

**Dil.** Bu paragraf Faz 19'a kadar temayla aynı gerekçeyi paylaşıyordu:
metinler bileşenlerin içinde düz yazılıydı, sözlük yoktu. Faz 19–25 arasında
çeviri katmanı kuruldu ve **tamamlandı** — arayüz Türkçe ve İngilizce
çalışıyor, seçim navbar'daki küre simgesinden yapılıyor. Ayrıntı README'deki
"Çok dillilik" bölümünde. Ayarlar'daki "Yakında" rozeti bu yüzden bölümden
kalktı; tema hâlâ beklemede ve bunu artık kendi açıklaması söylüyor.

Aynı dürüstlük kuralı **2FA** ve **API anahtarları** için de geçerli. Supabase
TOTP'yi destekliyor ama bir aç/kapa anahtarı olarak sunulamıyor: QR okutma,
kod doğrulama ve **giriş akışına ikinci adım eklenmesi** gerekiyor. Yalnızca
kaydı yapıp girişte sormamak, olmayan bir güvenliği varmış gibi göstermek
olurdu — bu yüzden bölüm boş ve nedeni yazılı.

### Rozetler neden hesaplanıyor, saklanmıyor

Rozetler bir tabloda tutulmuyor; `getAgentPerformance()` çıktısından anlık
türetiliyor (`lib/badges.ts`).

"Rozet kazanma" bir olay gibi düşünülüp `agent_badges` tablosuna
yazılabilirdi. O yol üç şey daha isterdi:

1. **Tetikleyiciler** — her satış, ilan ve müşteri kaydında "bu kişi bir
   eşiği geçti mi" kontrolü.
2. **Geri alma** — bir satış silinirse "İlk Satış" rozeti ne olacak?
3. **Geçmişi doldurma** — tablo açıldığında mevcut kayıtlar için rozetlerin
   geriye dönük hesaplanması.

Oysa rozetin kendisi zaten bir sorgu sonucu: *"toplam satış ≥ 1"*. Veriden
türetince üçü de kendiliğinden çözülüyor — satış silinirse rozet de gider,
geçmiş veri zaten sayılır, tetikleyiciye gerek kalmaz.

Kaybedilen şey: bir rozetin **ne zaman** kazanıldığı bilinmiyor ve kazanma
anında bildirim gönderilemiyor. İkisi de bu görsel detay için gereksiz. Karar
değişirse eşikler zaten tek yerde (`THRESHOLDS`), tablo o listeden doldurulur.

Fonksiyon saf olduğu için testten geçiyor (`badges.test.ts`) ve **yeni sorgu
açmıyor** — Faz 6/8'de yazılan performans hesabını yeniden kullanıyor.

### `/profil` neden ayrı route

`/personeller/[id]` yönetici kapısının arkasında (`getManagerAgent()`) ve öyle
kalmalı: orası ekip yönetimi ekranı, başkalarının primini gösteriyor. Ama
herkesin kendi profiline erişmesi gerekiyor.

Kapıyı "ya yöneticiyse ya da kendi kaydıysa" diye gevşetmek tek sayfaya iki
iş yüklerdi — bir yönetici için "personeli yönet", kullanıcı için "profilim";
başlık, düğmeler ve dönüş bağlantısı da ikiye ayrılırdı.

Bunun yerine ayrı route + **paylaşılan bileşenler**: `AgentCover`,
`AgentStats` ve `AgentBadges` her iki sayfada aynı. Farklı olan yalnızca
sayfanın çerçevesi — zaten farklı olması gereken şey.

### Kendi kaydını güncelleme: RLS tek başına yetmiyor

Faz 6'daki `agents_write` politikası yazmayı yalnızca yöneticiye veriyordu; bir
danışman kendi telefonunu bile değiştiremiyordu. `0010_settings.sql` buna
`agents_self_update` ekliyor.

Ama **politika kolon koruyamaz**: Postgres satır seviyesinde karar verir, "şu
kolonlar hariç" diyemez. Yani politika tek başına bir danışmanın kendi rolünü
`patron` yapmasını engellemiyor.

Kolon koruması bu yüzden uygulamada: `lib/actions/profile.ts` alan listesini
elle kuruyor ve istemciden gelen gövdeyi doğrudan geçirmiyor. `role`,
`commission_rate`, `is_active`, `user_id` ve `email` o listeye hiç girmiyor.
Projedeki **tek** "uygulama katmanı da savunma hattı" noktası; hem migration
hem action dosyası bunu açıkça işaretliyor. Gerçek yetki değişikliği yine
servis anahtarıyla çalışan ayrı dosyada (`lib/auth/admin-actions.ts`).

Şifre değiştirmede de benzer bir boşluk kapatıldı: Supabase'in
`auth.updateUser({ password })` çağrısı **mevcut şifreyi sormuyor**, geçerli
oturum yeterli. Açık bırakılmış bir bilgisayarda oturuma erişen biri hesabı
devralabilirdi. Bu yüzden action önce `signInWithPassword` ile mevcut şifreyi
doğruluyor; e-posta oturumdan okunuyor, formdan değil.

## Kapsam dışı: AI Asistan

Menüde Faz 1'den beri bir **AI Asistan** öğesi duruyordu ("ilan metni yazma,
müşteri eşleştirme, fiyat önerisi"). Faz 13'te **tamamen kaldırıldı**: menü
öğesi, `/ai-asistan` route'u ve README'deki izleri.

**Neden.** Özellik bir arayüz sorunu değil, bir **entegrasyon** sorunuydu:
gerçek bir dil modeli API'si (Anthropic ya da başkası), sunucu tarafında
anahtar yönetimi, akış (streaming) yanıtları, jeton sayımı ve istek başına
maliyet. Bunların hiçbiri "birkaç ekran daha" değil; kendi başına bir faz ve
kendi başına bir işletme maliyeti. Projenin geri kalanı tek bir sabit maliyetle
(Supabase) çalışıyor, AI ise **kullanım başına ücretli** ve bu kararın
sahibinin ürünü kullanan ofis olması gerekiyor.

İkinci gerekçe dürüstlük: menüde duran ama açılınca "yakında" diyen bir madde,
uygulamanın *yapabildiği* şeyler hakkında yanlış bir izlenim veriyordu.
Kaldırmak, olmayan bir özelliği vaat etmemek demek.

**Geri getirmek isteyene.** Silinen tek şey bir menü kaydı ve bir yer tutucu
sayfaydı — hazırlık amaçlı yazılmış iskelet, tip ya da ölü kod yoktu, yani
geri almanın maliyeti de yok. `config/navigation.ts` içindeki "Yönetim"
grubuna bir `NavItem` eklemek ve route'u açmak yeterli; sidebar, komut paleti
ve mobil çekmece o listeden beslendiği için kendiliğinden güncellenir.

## Mesajlar, Evraklar ve Bildirimler

Menüdeki son üç "yakında" ekranı. Birlikte ele alındılar çünkü aynı iki
altyapıyı paylaşıyorlar: **dosya işlemleri** (Storage) ve **canlı güncelleme**
(Realtime).

| Dosya | İş |
| ----- | -- |
| [`lib/documents.ts`](src/lib/documents.ts) · [`lib/notifications.ts`](src/lib/notifications.ts) | Sözlükler. Faz 18'e kadar tek bir `lib/messaging.ts` içindeydiler |
| [`lib/storage/signed.ts`](src/lib/storage/signed.ts) | İmzalı URL üretimi (`server-only`) |
| [`lib/storage/upload-document.ts`](src/lib/storage/upload-document.ts) | Private bucket'a sıkıştırmasız yükleme |
| [`lib/actions/notify.ts`](src/lib/actions/notify.ts) | Bildirim yazan ortak yardımcı — server action **değil** |
| [`hooks/use-realtime-insert.ts`](src/hooks/use-realtime-insert.ts) | Tek Realtime aboneliği kancası |

### `documents` bucket'ı neden private, diğer ikisi neden değil

Faz 7'de açılan `listings` ve `avatars` public. Bu üçüncüsü değil ve fark bir
tercih değil, **içeriğin doğası**:

Public bucket'ta URL'i bilen herkes dosyayı indirir — kimlik doğrulaması yok,
iptal imkânı yok. Faz 7'de bu kabul edilebilirdi çünkü oradaki içerik *zaten
yayınlanmak için var*: ilan fotoğrafı portallara çıkacak, portre avatarı
arayüzde herkese görünüyor. "Sızması" diye bir kavram yok.

Burada içerik **tapu, kimlik fotokopisi ve imzalı sözleşme.** Bir kez
paylaşılan kalıcı link süresiz geçerli kalır: e-postada, tarayıcı geçmişinde,
sunucu loglarında yaşar. Private bucket + imzalı URL bunu üç yerden kapatıyor:

1. Nesneye erişim oturum gerektiriyor (`storage.objects` politikası).
2. İmza **60 saniyelik** — sızsa bile kısa ömürlü.
3. URL sunucuda, kullanıcının kendi oturumuyla üretiliyor; belge satırını
   göremeyen kullanıcı imza da alamıyor.

Bedeli: her indirme bir imzalama adımı ve önbelleklenemeyen bir adres.
Fotoğraf galerisi için bu maliyet anlamsızdı (46 kart = 46 imza, her sayfa
yüklemesinde), tapu için ucuz.

**Asıl kapı Storage politikası değil, `documents` tablosu.** Faz 7'deki sorun
burada da geçerli: dosya yolu düz (`<uuid>.<ext>`) olduğu için bir nesnenin
hangi müşteriye ait olduğu `storage.objects` üzerinden bilinemez. Ama bu sefer
ilişki başka yerde duruyor — `documents` tablosunda, kendi RLS'iyle. Bu yüzden
Storage politikası bilerek geniş ("aktif personelsen bu bucket'ı okuyabilirsin");
erişimi sınırlayan şey **yolu öğrenebilmek**, ve yol yalnızca RLS'e tabi
tablodan geliyor. Politikayı `owner = auth.uid()` ile daraltmak, bir danışmanın
kendi müşterisi için başkasının yüklediği tapuyu açamaması demekti.

**Mesaj ekleri de aynı bucket'a gidiyor.** Bir müşteriye gönderilen kimlik
fotokopisi, arşivdekinden daha az hassas değil.

İki modülde imzalama stratejisi **bilerek farklı**:

| | Ne zaman imzalanıyor | Neden |
| - | - | - |
| Evrak listesi | Tıklandığı an, tek tek | 20 belgenin 19'u zaten açılmayacak; üstelik 60 sn sonra hepsi ölürdü |
| Mesaj ekleri | Sayfa çizilirken, toplu | Ek sohbet balonunda **görsel olarak** çiziliyor, tıklama olmadan da adres gerekiyor |

### `notifications` ile `activity_log` farkı

İki tablo benzer görünüyor, işleri farklı:

| | `activity_log` | `notifications` |
| - | - | - |
| Ne anlatır | "Ofiste ne oldu" | "Benim ilgilenmem gereken ne var" |
| Sahibi | Yok — ortak akış | `agent_id` |
| Okundu bilgisi | Yok | `read_at` |
| Nerede görünür | Dashboard > Son Aktiviteler | Zil açılırı + `/bildirimler` |
| Bir olay kaç satır | **Bir** | İlgilenen **her kişi için bir** |

Tek tabloya sıkıştırmak, okundu bilgisini olayın kendisine bağlamak demekti:
bir satış kapandığında "okundu" işaretini ilk gören, herkes için kapatırdı.

**Tetikleyiciler veritabanında değil, server action'larda.** `after insert`
trigger'ı da aynı satırları yazabilirdi ama projede yan etkiler baştan beri
action içinde duruyor (teklif kabulü satışı orada açıyor, tamamlanan randevu
çizelgeye orada yazıyor). Üç somut gerekçe:

- Bildirim **metni** arayüz diliyle yazılıyor; SQL içinde Türkçe cümle kurmak
  metni koddan koparırdı.
- Trigger `revalidatePath` çağıramaz — bildirim yazılır, zil rozeti güncellenmezdi.
- Kimin bildirim alacağı bazen bir **iş kuralı** ("prim ilanın sahibine gider,
  bildirim de ona"); veritabanı bunu bilmiyor.

Yazan dört nokta: yeni müşteri (`actions/customers.ts`), yeni ilan
(`actions/listings.ts`), teklif kabulü (`actions/offers.ts`), yeni randevu ve
müşteriden gelen mesaj. **Kendi eyleminin bildirimi yazılmıyor** — `notify()`
aktörle hedef aynıysa satırı hiç açmıyor. Müşteriyi ekleyen danışman zaten
eklediğini biliyor; bildirim ancak *başkasının* eylemi seni ilgilendirdiğinde
anlamlı.

RLS'te küçük bir ayrıntı: okuma yöneticiye de açık (rol modeline sadık
kalındı) ama **güncelleme yalnızca kendi satırında** — bir patron ekibin
bildirimini görebilir, okundu yapamaz. Uygulama zaten her sorguya
`agent_id = ben` filtresi koyuyor.

### Realtime nerede var, nerede yok

**İki yerde:** mesaj akışı ve bildirim zili. Başka hiçbir yerde.

Ölçüt şu: *Realtime'ın değeri, veriyi **başkasının** değiştirdiği ve senin
bunu beklemeden öğrenmen gereken yerde.*

- Bir danışman kendi ilanını düzenlediğinde ekranı zaten kendisi değiştiriyor;
  `router.refresh()` sonucu anında gösteriyor. Bir WebSocket hiçbir şey
  eklemez — üstüne her sayfada açık duran bir soket, yeniden bağlanma mantığı
  ve iki ayrı doğruluk kaynağı getirir.
- Mesaj ve bildirim ise **tanımı gereği dışarıdan** geliyor. Müşteri
  yazdığında ya da yönetici teklifini kabul ettiğinde kullanıcının sayfayı
  yenilemesini beklemek, özelliğin kendisini işlevsiz bırakırdı.

Bu yüzden `supabase_realtime` yayınına yalnızca `messages` ve `notifications`
eklendi (`0008_messaging.sql`). İlanlar, müşteriler, teklifler, randevular ve
satışlar dışarıda — bu bir eksiklik değil, kapsam kararı.

Uygulamada **tek doğruluk kaynağı yine sunucu.** Realtime aradaki boşluğu
dolduruyor: gelen satır yerel listeye ekleniyor, sunucu verisi tazelendiğinde
(`router.refresh()`) yerel durum ona teslim ediliyor. Aksi halde okundu
işaretlendikten sonra eski hâl ekranda kalırdı.

Filtre **sunucu tarafında** (`agent_id=eq.…`): hepsini alıp tarayıcıda elemek,
başkalarının bildirimlerini ağdan geçirmek olurdu. Abonelikler bileşen
kaldırılırken kapatılıyor — kapatılmasaydı her gezinmede bir soket birikir ve
aynı olay birden çok kez işlenirdi.

### Mesaj merkezi Faz 18'de kaldırıldı

Bu bölümde iki panelli mesaj merkezinin (mobilde saf CSS ile ayrılan liste/akış
düzeni, `dvh` yüksekliği, müşteri başına tek konuşma, hazır şablonlar) tasarımı
anlatılıyordu. **Tamamı kaldırıldı** — gerekçesi bir sonraki başlıkta.

Kalıcı olan tek fikir, ayrımın URL'de tutulmasıydı: `?k=` bileşen durumu değil
arama parametresiydi ve bu sayede bağlantı paylaşılabiliyor, geri tuşu
çalışıyor, veri sunucuda çekilebiliyordu. Aynı fikir yeni panoda da geçerli
(`?f=` sekme, `?t=` tür, `?q=` arama, `?n=` vurgu).

## Faz 18 — mesajlaşma yerine iş notları

Faz 12'de kurulan `conversations` + `messages` ikilisi kaldırıldı; yerine tek
bir `work_notes` tablosu geldi (`0012_work_notes.sql`).

| Dosya | İş |
| ----- | -- |
| [`lib/work-notes.ts`](src/lib/work-notes.ts) | Sözlük + saf kurallar: türler, durumlar, sekmeler, @mention jetonu |
| [`lib/data/work-notes.ts`](src/lib/data/work-notes.ts) | Pano, kayda bağlı listeler, rozet sayacı, form seçenekleri |
| [`lib/actions/work-notes.ts`](src/lib/actions/work-notes.ts) | Not yazma, **devir**, çözme/yeniden açma, silme |
| [`components/work-notes/`](src/components/work-notes) | Kart, form, filtre çubuğu, ikon, detay bölümü |

### Neden sohbet modeli çalışmıyordu

Sohbetin **bir tarafı hiç var olmadı.** Müşteriler uygulamaya girmiyor; girmeleri
için hesap, davet akışı ve ayrı bir arayüz gerekirdi — hiçbiri yok, olması da
planlanmadı. Danışman "gönder"e bastığında mesaj hiçbir yere ulaşmıyordu.

Şemanın kendi yorum satırı bunu zaten söylüyordu: *"Müşteri tarafında gerçek bir
istemci YOK; `'customer'` yönü, gelen bir mesajın elle kaydedilmesi ve seed
verisi için."* Yani tasarım, kendi boşluğunu belgeleyip yoluna devam etmişti.

"Gelen mesajı elle kaydetmek" ise bir yazışma kopyalama işi ve sahada kimse
yapmaz. Ortaya çıkan şey **görünen ama işlemeyen bir özellikti** — demoda
çalışıyormuş gibi göründüğü için de fark edilmesi zor olanı.

### Yerine gelen model

Bir emlak ofisinde uygulama içinde gerçekten yürüyen iletişim ekip içi olanı ve
her zaman **bir kayda bağlı**: bir müşteriye ya da bir ilana. `work_notes` bu
yüzden bir sohbet dizisi değil, kayda iliştirilmiş notlar kümesi.

| Tür | Ne | Durum |
| --- | -- | ----- |
| `question` | Cevap bekleyen talep | `open` → `resolved` |
| `assignment` | Sorumluluk devri | `open` → kabul edildi |
| `note` | Bilgi notu | **`null`** — takip edilmiyor |

`status` kolonu **nullable** ve bunu bir CHECK kısıtı zorluyor
(`work_notes_status_matches_type`). "Fiyatta esnek değil" notu çözülecek bir şey
değil; ona zorla bir durum vermek panodaki "Çözülmüş" sekmesini ya bütün notları
toplayan ya da hiçbirini toplamayan bir filtreye çevirirdi.

**@mention bir kolon, metin değil.** Metindeki "@Mehmet" yalnızca okuyanın gözü
için; kaydedilen `mentioned_agent_id`. Ayrıştırmaya güvenmek iki "Mehmet"te
çöker, isim değişince eski notları kırar ve sidebar rozeti bir metin araması
yapamaz. Form bu yüzden serbest metin değil bir açılır kullanıyor — seçim metne
de yansıyor (`withMention`), ikisi birden doğru kalıyor.

**Yanıt ayrı bir tablo değil**, aynı tablo (`parent_note_id`). Ayrı bir
`work_note_replies`, aynı alanları (yazar, içerik, ek, zaman) ikinci kez
tanımlamak olurdu. Yanıt her zaman `note` türünde: bir soruyu cevaplamak panoya
ikinci bir açık madde eklememeli.

### Atama gerçekten devrediyor

`note_type = 'assignment'` yazıldığında server action `assigned_agent_id` /
`agent_id` alanını değiştiriyor. Alternatif — atamayı metin olarak bırakmak —
zararsız görünüyor ama değil: kayıt hâlâ eski danışmanı gösterirken duran bir
"ben üstleniyorum" notu **yalan söyler.** İki doğruluk kaynağı doğar. Bu tam
olarak kaldırılan `messages` tablosunun hatası.

Sıra bu yüzden **önce devir, sonra kayıt**: devir başarısızsa hiçbir şey
yazılmıyor. Devralan formdan seçilen kişi, seçilmezse notu yazan — tek form iki
senaryoyu karşılıyor ("sana veriyorum" / "ben üstleniyorum"). İkincisinde not
açık kalmıyor, çünkü kabul edecek kimse yok.

**İki RLS engeli aşılmak zorundaydı:**

1. `customers_scoped` / `listings_scoped` `WITH CHECK` tarafında da "sahibi ben
   olmalıyım" diyordu ve `WITH CHECK` güncelleme *sonrası* satıra bakıyor —
   yani bir danışman kendi müşterisini başkasına devredemiyordu. Yeni
   `customers_handoff` / `listings_handoff` politikaları dar: `USING` hâlâ "şu an
   sahibi benim", yalnızca `WITH CHECK` gevşiyor. Kazanılan tek yeni yetki,
   sahip olunan kaydı elden çıkarmak.
2. `notifications_write` yalnızca yöneticiye başkasına yazma izni veriyordu;
   @mention sadece yöneticiler için çalışırdı. Gevşetildi — asıl kapı zaten
   uygulamada: `notify()` bir server action değil, istemciden çağrılamıyor.

### Rozet anlam değiştirdi

Sidebar'daki "Mesajlar" rozeti artık "okunmamış mesaj" değil **sana yönelik açık
iş** sayıyor. Okundu damgası diye bir kolon yok ve olmasına gerek de yok: notu
okumak işi bitirmiyor, kapatmak bitiriyor. Realtime aboneliği de `messages`
yerine `work_notes`u dinliyor, filtre `mentioned_agent_id=eq.<ben>`.

### Evraklar müşteri arama odaklı

Aynı fazda `/evraklar` varsayılan görünümü değişti: arşiv listesi yerine **büyük
bir müşteri arama kutusu** ve belge sayılı müşteri kartları. Gözlem basit —
sahada kimse "hangi belgeler var" diye sormuyor, "Ahmet Bey'in tapusu nerede"
diye arıyor.

Üç görünüm var ve ayrımı URL'de: varsayılan (arama), `?customer=<id>` (o
müşterinin belgeleri + yükleme) ve `?arsiv=1` (eski tam liste). **Arşiv
kaldırılmadı**: bir kayda bağlanmamış belgeler var (`related_customer_id`
nullable) ve onlara ulaşan tek yol o liste.

Müşteri ve ilan detayındaki evrak kartı da değişti — eskiden salt okunur bir
özetti, artık yükleme ve indirme yapılabiliyor. Eski gerekçe bundle'dı (indirme
imzalı URL istiyor, o da istemci bileşeni demek); aynı fazda detay sayfalarına
iş notları geldiği ve onlar zaten istemci bileşeni olduğu için o maliyet
paylaşılan parçalar üzerinden ödendi.

## Faz 19 — görsellerin gerçekçiliği

İki demo verisi kusuru düzeltildi. İkisi de veri katmanını değil yalnızca
seed'i ve sunum bileşenlerini ilgilendiriyordu ama uygulamanın tamamının
inandırıcılığını düşürüyorlardı.

### İlan fotoğrafları: rastgele servis → elle seçilmiş havuz

Önceki sürüm `picsum.photos/seed/<ilan-id>/1200/800` kullanıyordu. Adres ilan
kimliğinden türediği için görsel **kararlıydı** (aynı ilan hep aynı fotoğrafı
gösteriyordu) — ama picsum'un bir kategori kavramı yok. Sonuç: "1+1 Dubleks"
ilanının kapağında kahve çekirdeği, "1.620 m² Arsa" ilanında dizüstü
bilgisayar.

Bir emlak uygulamasında bu tek bakışta fark ediliyor ve geri kalan her şeyi de
şüpheli hâle getiriyor.

`source.unsplash.com/?apartment` gibi anahtar kelimeli servisler bunu çözerdi
ama o uç 2024'te kapandı (503). Bu yüzden havuzlar elle kuruldu: adaylar
Unsplash CDN'inden çekilip **içerikleri gözle doğrulandı**, kategoriye
uymayanlar elendi.

| Kategori | Havuz | İçerik |
| -------- | ----- | ------ |
| `satilik` + `kiralik` | 38 | Ağırlıklı **iç mekân**: salon, mutfak, yatak odası, banyo |
| `villa` | 21 | Bina ve bahçe — villada karakter binanın kendisi |
| `ofis` | 13 | Açık ofis, toplantı odası, cam cepheli bina |
| `arsa` | 6 | Tarla, çitli parsel, kuşbakışı yerleşim |

**Daire havuzu neden iç mekân ağırlıklı:** bir apartman dairesinin dış cephesi
ayırt edici değil — kırk ilan aynı beton bloğu gösterirdi. Alıcının baktığı şey
salon ve mutfak. Villa ve ofiste tersi geçerli.

**Arsa havuzu neden en dar:** boş parsel fotoğrafı stok arşivlerde nadir ve
aramalar hızla manzara fotoğrafına dönüyor. Orman, plaj ve karlı dağ kareleri
bilerek elendi — onlar da en az kahve çekirdeği kadar alakasız olurdu. Altı
görsel, altı arsa ilanı için yeterli ve her birinin kapağı farklı.

**Kapak benzersiz:** `imagesFor()` havuza ilan indeksinden giriyor, yani aynı
kategorideki ardışık ilanlar farklı kapaklarla açılıyor. Liste sayfasında yan
yana duran iki kartın aynı fotoğrafı göstermesi, veriyi sahte gösteren
şeylerden biri.

### Müşteri portreleri tamamen kaldırıldı

Seed, kayıtların yaklaşık üçte ikisine `i.pravatar.cc` üzerinden rastgele
portre yazıyordu; `CustomerAvatar` da fotoğraf varsa onu, yoksa baş harfleri
çiziyordu.

İki sebeple kaldırıldı:

1. **Gerçekçi değil.** Bir emlak ofisi müşterisinin vesikalığını sisteme
   girmiyor — elinde adı ve telefonu var. Stok portreler olmayan bir veriyi
   varmış gibi gösteriyordu.
2. **Yanlış izlenim.** Rastgele kadın/erkek fotoğrafları listeyi bir sosyal ağ
   görünümüne çeviriyor, kaydın kendisinden (bütçe, durum, son görüşme) dikkati
   alıyordu.

Kaldırma **komple**: seed `null` yazıyor, müşteri formundaki yükleme alanı
gitti, `CustomerAvatar` artık `src` prop'u bile almıyor. Baş harfler isimden
türetiliyor ve Türkçe büyütme kullanılıyor — `toUpperCase()` "i" harfini "I"
yapardı, doğrusu "İ".

**`AgentAvatar` DOKUNULMADI.** Personel fotoğrafında veri gerçek: danışman
kendi profil fotoğrafını Ayarlar'dan yüklüyor ve o fotoğraf müşteriye
gösterilen bir şey.

`customers.avatar_url` kolonu şemada duruyor ama uygulama artık yazmıyor.
Düşürülmedi çünkü `updateCustomer` içindeki temizlik dalı hâlâ işe yarıyor:
özellik kaldırılmadan önce yüklenmiş bir dosya varsa, kayıt düzenlendiğinde
bucket'tan siliniyor. Kolonu atmak o dosyaları kalıcı olarak yetim bırakırdı.

## Randevular (takvim)

Zincirin başındaki halka: **randevu → ilgi → teklif → satış.** Müşteri
çizelgesinde "İlanı yerinde gezdi" satırları Faz 4'ten beri duruyordu ama onları
üreten bir kayıt yoktu; olay elle giriliyordu.

| Dosya | İş |
| ----- | -- |
| [`lib/calendar.ts`](src/lib/calendar.ts) | Saf tarih matematiği: gün anahtarı, hafta/ay ızgarası, çakışma yerleşimi, sürükleme yuvarlaması |
| [`lib/appointments.ts`](src/lib/appointments.ts) | Etiketler, renk paleti, durum geçişleri, tür → çizelge olayı eşlemesi |
| [`lib/data/appointments.ts`](src/lib/data/appointments.ts) | Aralık sorgusu ve mini liste sorguları |
| [`lib/actions/appointments.ts`](src/lib/actions/appointments.ts) | Oluşturma, güncelleme (sürükle-bırak dahil), durum değişikliği, silme |
| [`components/appointments/`](src/components/appointments) | Kabuk, üst çubuk, saatlik ızgara, ay ızgarası, panel, form |

### Sürükle-bırak: kütüphane yerine Pointer Events

**dnd-kit** (core + modifiers, ~13 kB gzip) ve **react-dnd** değerlendirildi;
ikisi de bu iş için fazla geldi. O kütüphanelerin çözdüğü sorun "hangi öğe
nereye düştü" — sıralanabilir listeler, çoklu sürükleme kaynağı, çarpışma
algoritmaları, serbest bırakma alanları. Takvimdeki soru ise tek satırlık bir
aritmetik:

```
yeni_başlangıç = eski_başlangıç + (sürüklenen_piksel / dakika_başına_piksel)
```

Hedef serbest bir alan değil **sabit bir ızgara**; sütun genişliği ve saat
yüksekliği zaten elimizde. Bir soyutlama katmanı, bilmediğimiz bir şeyi
öğretmeyecek, yalnızca paketi büyütecekti. Sonuç: `/randevular` sayfası
**14,2 kB** (First Load 176 kB) — kıyas için `/ilanlar` 5,6 kB / 165 kB,
`/personeller/[id]/duzenle` 3,8 kB / 231 kB.

Uygulamadaki üç ayrıntı:

- **Dinleyiciler `window` üzerinde**, `setPointerCapture` ile değil.
  Sürüklenen randevu başka bir güne geçtiğinde React onu farklı bir sütuna
  taşıyor, yani DOM düğümü yeniden kuruluyor — yakalama o anda kopardı.
- **Önizleme gerçek konumda.** Sürüklenen randevu hayalet bir kopya değil;
  hedef sütuna gerçekten taşınıyor ve çakışma hesabı yeni konuma göre
  yapılıyor. State yalnızca 15 dakikalık adım değiştiğinde tazeleniyor, yani
  imleç bir slot içinde gezinirken render yok.
- **İyimser konum + geri alma.** Sunucu yanıtı gelene kadar randevu yeni
  saatinde duruyor; işlem reddedilirse eski yerine dönüyor ve bildirim
  nedenini söylüyor ([`calendar-workspace.tsx`](src/components/appointments/calendar-workspace.tsx)).

**Dokunmatikte sürükleme kapalı.** Dikey sürükleme ile sayfayı kaydırma aynı
harekettir; `touch-action: none` ile ayrıştırmak takvimin kaydırılamaz hale
gelmesi demekti. Telefonda saat değiştirmek için düzenleme formu var — mobil
zaten günlük görünümde ve tek sütun.

### Çizelge entegrasyonu nasıl tetikleniyor

Bir randevu **"tamamlandı"** işaretlendiğinde `customer_timeline_events`
tablosuna otomatik bir satır düşüyor. Tetikleyici **veritabanında değil**,
[`setAppointmentStatus`](src/lib/actions/appointments.ts) server action'ının
içinde:

1. Randevu okunuyor, geçiş kuralı saf fonksiyondan doğrulanıyor
   (`canTransition`).
2. Durum güncelleniyor — koşula **mevcut durum** ekli. Randevu iki sekmede
   birden tamamlandı işaretlenirse ikinci istek hiçbir satır güncelleyemez ve
   çizelgeye ikinci bir satır düşmez. `actions/offers.ts`teki teklif kabulüyle
   aynı kapı.
3. Randevu türü çizelge olayına çevriliyor (`timelineEventFor`): ev gezme →
   `viewed`, telefon görüşmesi → `called`, diğerleri → `negotiation`.
4. `occurred_at` olarak **randevunun başlangıç saati** yazılıyor, `now()`
   değil: görüşme o an gerçekleşti, kaydın yazıldığı an değil.
5. Müşterinin `last_contact_at` alanı da aynı ana çekiliyor — liste
   sayfasındaki "son görüşme" sütunu bu alandan besleniyor.

Neden Postgres tetikleyicisi değil: projede yan etkiler baştan beri server
action içinde (teklif kabulü satışı orada açıyor, ilan silme depoyu orada
temizliyor). Kuralın tek yerde olması, "bu satır nereden geldi" sorusunun
cevabının da tek yerde olması demek. Ayrıca bir DB tetikleyicisi
`revalidatePath` çağıramaz — çizelge güncellenir, ekran güncellenmezdi.

Hiçbir randevu türü `purchased` olayı üretmiyor: satın alma çizelgeye teklif
kabul edildiğinde düşüyor ve iki kaynak aynı olayı yazarsa çizelge aynı şeyi
iki kez anlatırdı.

**Geri alma çizelgeden satır silmiyor.** "Tamamlandı → planlandı" mümkün ama
geçmişi geriye dönük düzeltmek kullanıcının açıkça istemesi gereken ayrı bir
iş. Teklifin aksine randevuda **terminal durum yok**; arkasında satış satırı
gibi bir zincir olmadığı için yanlış işaretlenen bir randevu düzeltilebilir.

### Mobilde takvim nasıl basitleştirildi

Bir haftalık ızgara 375px'de yedi sütuna bölününce sütun başına ~45px kalıyor
ve içine ne saat ne başlık sığıyor. Üç kademe:

| Görünüm | Masaüstü | Mobil |
| ------- | -------- | ----- |
| **Gün** | Tek sütunlu saatlik ızgara | Aynı — 375px'de rahat çalışıyor, **varsayılan görünüm bu** |
| **Hafta** | 7 sütunlu ızgara, sürükle-bırak | Aynı ızgara ama sütunlar dar; kullanıcı açıkça seçerse gösteriliyor |
| **Ay** | Hücrede en fazla 3 randevu çipi + "+N" | Çip yerine **renkli noktalar**; hücreye dokunmak o günün günlük görünümünü açıyor |

**Varsayılan görünüm sunucuda seçiliyor**, istemcide değil
([`lib/device.ts`](src/lib/device.ts)). `useMediaQuery` ile karar vermeyi
denedik: sunucu ekran genişliğini bilmediği için ilk boyama haftalık ızgarayı
çiziyor, hydration'dan hemen sonra günlük görünüme atlıyordu — görünür bir
sıçrama. İki görünümü birden çizip CSS ile gizlemek de olmadı: üst çubuktaki
ileri/geri okları hangi birimle (gün mü hafta mı) hareket edeceğini bilemezdi.

Karar `sec-ch-ua-mobile` istemci ipucundan, göndermeyen tarayıcılarda
user-agent'tan veriliyor. iPadOS masaüstü kimliği bildiriyor ve **bu doğru**:
tablette haftalık ızgara rahatça sığıyor. Tahminin yanılması da ucuz —
kullanıcı sekmeye dokunduğu anda görünüm URL'e yazılıyor (`?view=…`) ve tahmin
bir daha devreye girmiyor.

Faz 9'un diğer kalıpları korundu: filtreler `<768px`'de çekmeceye giriyor,
alt gezinme çubuğu **Randevular'ı beşinci öğe olarak aldı** (aşağıda).

### Renkler ve saat dilimi

Kategori renkleri için **yeni palet açılmadı**, `chart-1..5` kullanıldı. O beş
renk zaten "koyu zeminde birbirinden ayırt edilebilir" ölçütüyle seçilmişti ve
dashboard'daki kategori grafiğiyle aynı dili konuşuyor. Sınıf adları
`lib/appointments.ts` içinde **tam metin** yazılı — `bg-chart-${n}` gibi
kurgulanmış bir ad Tailwind'in tarayıcısına görünmez ve stil üretilmez.

Takvim, "gün nerede başlar" sorusuna kesin bir cevap ister ve
`new Date(...).getHours()` bu cevabı **çalıştığı makineden** alır: geliştirme
makinesi Istanbul, sunucu UTC. Aynı randevu sunucuda 21:00'da, tarayıcıda
00:00'da çizilirdi. Bu yüzden ofisin saat dilimi bir sabit:
`OFFICE_UTC_OFFSET_MINUTES = 180` (Türkiye 2016'dan beri yaz saati
uygulamıyor). Kolonlar yine `timestamptz`, yani saklanan değer mutlak an —
sabit olan yalnızca "bunu hangi güne yazacağız" kararı.

## Personel yönetimi

Faz 6'da Personeller modülü salt okunur bırakılmış ve buraya şu not düşülmüştü:
*"yeni personel, rol değişikliği ve prim oranı güncellemesi SQL'den yapılır"*.
Faz 10 o notu kapattı — davet, düzenleme ve pasifleştirme arayüzden yapılıyor.

### ⚠️ Servis anahtarı neden çalışma zamanına girdi ve nasıl sınırlandı

Kullanıcı hesabı oluşturmanın tek yolu Supabase **Auth Admin API**, o da servis
anahtarını gerektiriyor — ve o anahtar **her RLS politikasını atlar**. Faz 5'ten
Faz 9'a kadar anahtar yalnızca seed script'indeydi; artık uygulamada da var.

Dört katmanlı sınırlama:

| Katman | Ne yapıyor |
| ------ | ---------- |
| [`lib/supabase/admin.ts`](src/lib/supabase/admin.ts) | `import "server-only"` — istemci bileşeninden import edilirse **derleme hatası**. Çalışma zamanına kadar beklenmez |
| Ortam değişkeni | `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_` öneki yok → Next istemci paketine hiçbir koşulda gömmez |
| [`lib/auth/admin-actions.ts`](src/lib/auth/admin-actions.ts) | Anahtarı kullanan **tek** dosya; her fonksiyon `requireManager()` ile başlar |
| Yetki kaynağı | Rol istemciden alınmaz: oturum çerezinden `getUser()` ile doğrulanan kullanıcının `agents` satırı **RLS'e tabi** normal istemciyle okunur |

**Kritik fark:** projenin geri kalanında RLS bir güvenlik ağıdır — bir action'da
yetki kontrolü atlansa bile politika durdurur. Burada öyle değil; servis
anahtarı politikayı atladığı için **yetki kontrolü tek savunma hattı**. Bu
yüzden her fonksiyonun ilk satırında ve atlanamaz.

Ek yetki sınırları (hepsi sunucuda, arayüzdeki kilitler yalnızca kozmetik):

- Kimse **kendi** rolünü veya primini değiştiremez
- `patron` rolünü yalnızca bir patron atayabilir/alabilir
- **Son aktif patron pasifleştirilemez** — aksi halde kimse kimseyi geri
  açamaz ve sistem SQL Editor'süz kurtarılamaz hale gelirdi
- Pasifleştirilmiş bir yönetici de yetkisizdir

> Doğrulandı: üretim derlemesinde anahtar değeri istemci paketlerinde
> **bulunmuyor** (`.next/static` tarandı). Tek eşleşme `@supabase/supabase-js`
> kütüphanesinin kendi anahtar biçimi denetleyicisi.

### Neden "sil" değil "pasifleştir"

Bir danışmanın ilanları, müşterileri ve kapanan satışları ona bağlı. Şema zaten
silmeye izin vermiyor (`on delete restrict`) ve bu doğru: ayrılan bir danışmanın
geçmiş cirosu **ofisin geçmişidir**. Kayıt silinseydi prim tabloları, satış
listeleri ve aktivite akışı delinirdi.

`is_active = false` olan personel:

- giriş yapabilir ama **hiçbir veri göremez**
- listelerde "pasif" rozetiyle görünür, geçmiş kayıtları olduğu gibi kalır
- istenildiği an geri açılır

Kesme **tek noktadan**: `current_agent_id()` pasif personel için `null` döndüğü
an 0002/0005'te yazılmış tüm politikalar kendiliğinden kapanıyor. Sekiz tablonun
politikalarına ayrı ayrı `is_active` koşulu eklemeye gerek kalmadı.

Bunun bir yan etkisi vardı ve ayrıca çözüldü: pasif kullanıcı **kendi** personel
kaydını da göremez hale gelirdi, arayüz de "hesabınız bir personel kaydına bağlı
değil" derdi — yanlış teşhis. `agents_self_read` politikası kullanıcının kendi
satırını her durumda okumasına izin veriyor, uygulama da bu durumu ayrı bir
ekranla karşılıyor ([`deactivated-notice.tsx`](src/components/auth/deactivated-notice.tsx)).

### Davet: e-posta yerine tek seferlik şifre

`inviteUserByEmail()` var ama Supabase'in yerleşik SMTP'si saatte birkaç
e-postayla sınırlı ve kendi alan adınızdan gönderim için ayrı yapılandırma
istiyor. Yapılandırılmamış bir kurulumda davet **sessizce düşerdi** — yönetici
"gönderildi" görür, personel hiçbir şey almazdı.

Bunun yerine:

1. `auth.admin.createUser()` ile hesap açılır (`email_confirm: true`, çünkü
   doğrulama e-postası da gitmeyebilir)
2. `crypto.getRandomValues` ile 16 karakterlik şifre üretilir — karıştırılabilir
   karakterler (`0/O`, `1/l/I`) alfabeden çıkarıldı, şifre sözlü iletilecek
3. Şifre yöneticiye **bir kez** gösterilir; hiçbir yere kaydedilmez ve sunucu
   onu bir daha üretemez
4. Yeni auth kullanıcısı otomatik olarak bir `agents` satırına bağlanır

Personel satırı yazılamazsa auth kullanıcısı **geri alınır** — yoksa giriş
yapabilen ama hiçbir şey göremeyen yetim bir hesap kalırdı.

SMTP kurulduğunda `createUser` çağrısını `inviteUserByEmail` ile değiştirmek tek
satırlık bir iş.

### Denetim kaydı

`agent_audit_log` rol ve prim değişikliklerini tutuyor: kim, kimi, ne zaman,
eski değer → yeni değer. **Yazma politikası yok** ve bu kasıtlı — kayıtları
yalnızca server action'lar servis anahtarıyla yazar, giriş yapmış hiç kimse
(yönetici dahil) denetim kaydını elle üretemez ya da düzeltemez. Okuma
yöneticilere açık.

## Mobil gezinme

Faz 1-8 boyunca sidebar `lg` altında tamamen gizleniyor ve gezinme komut
paletine (Cmd+K) devrediliyordu. Masaüstünde savunulabilir bir tercihti ama bu
uygulama **sahada** kullanılıyor: danışman evin önünde, telefonda, tek elle.
Klavye kısayolu orada bir gezinme yöntemi değil.

### Üç kademe

| Genişlik | Gezinme | Neden |
| -------- | ------- | ----- |
| **< 768px** (md altı) | Alt çubuk + çekmece | Başparmak erişim alanı; sidebar için yer yok |
| **768–1023px** (md–lg) | Sidebar **daraltılmış** (76px ikon şeridi) | 268px sidebar içeriğe 500px bırakıyor — ilan kartları iki sütuna sığmıyor. 76px'te 690px kalıyor ve kartlar 2×314px oluyor |
| **≥ 1024px** (lg üstü) | Sidebar tam, daraltılabilir | Değişmedi |

Tablet kademesinde daraltma bir **tercih değil zorunluluk**: kullanıcının
kaydedilmiş seçimi bu aralıkta yok sayılıyor ve genişletme düğmesi gizleniyor.
Çalışmayan bir düğme göstermek, hiç göstermemekten kötüdür.

### Alt çubuktaki öğeler neden bunlar

**Dashboard · İlanlar · Müşteriler · Randevular · Satışlar** + "Daha Fazla".

Ölçüt basit: **gerçekten çalışan modüller.** Menüdeki 12 öğenin üçü hâlâ
"yakında" ekranı; kullanıcıyı boş bir sayfaya götüren kısayol koymak o slotu
çöpe atmak olurdu. Sahadaki kullanım da bunu doğruluyor — danışman telefonda ya
portföyüne bakar, ya müşterisine, ya günün programına, ya rakamlara.

Faz 9'da dört öğe vardı; Faz 11'de Randevular çalışır hale gelince beşe çıktı.
Sıra da buna göre: takvim, sahadaki bir danışmanın telefonda en sık açtığı
ekranlardan biri, Satışlar ise masa başı işi ve en sağda.

Faz 12'de Mesajlar ve Evraklar da çalışır hale geldi ama alt çubuğa **girmedi**:
beş slot dolu ve altıncı öğe aşağıdaki 62px'lik payı 52px'e indirirdi. İkisi de
çekmecede.

Beş öğe + çekmece, 375px'de hücre başına ~62px bırakıyor; en uzun etiket
("Randevular") 57px. Sığıyor ama payı yok, o yüzden etikete `truncate` eklendi:
320px'lik bir telefonda etiket çubuğu taşırmak yerine kısalıyor.

Adresler `config/navigation.ts` içinde duruyor ama **öğelerin kendisi değil**:
etiket, ikon ve rozet yine aynı `navigation` dizisinden çözülüyor. Alt çubuk ve
çekmece için ayrı bir menü listesi yazılmadı — 12 öğe iki yerde tutulsaydı biri
diğerinden sapardı.

### Ne nereye taşındı

- **Filtre çubukları** mobilde çekmeceye giriyor
  ([`components/filters/filter-row.tsx`](src/components/filters/filter-row.tsx)).
  İlanlar filtresinde yedi kontrol var; 375px'de alt alta sarılıp ekranın
  yarısını yiyordu. Geriye tek bir "Filtrele" düğmesi kalıyor, etkin filtre
  sayısı rozette.
- **Navbar** mobilde üç şeye iniyor: arama, bildirim, profil. Mesajlar, tema ve
  dil menü çekmecesine taşındı — altı ikon 375px'de başlığı eziyordu.
- **Çekmece tek render**: filtreler hem satırda hem çekmecede çizilseydi aynı
  `id`'ler belgede iki kez bulunur, `<label for>` bağları bozulurdu. Bu yüzden
  breakpoint kararı CSS'te değil JavaScript'te
  ([`hooks/use-media-query.ts`](src/hooks/use-media-query.ts)).

### Sidebar genişliği neden framer-motion'da değil

Faz 9'da somut bir hata çıktı: tablet aralığında sidebar daraltılmış
**davranıyor** (etiketler gizli, düğme yok) ama genişliği 268px'te **takılı
kalıyordu** — 768px'lik ekranda yatay taşma üretiyordu. Sebep framer-motion'ın
`transition={{ duration: 0 }}` ile verilen anında geçişi uygulamaması: ilk
boyamada 268 commit ediliyor, state değişince başlatılan sıfır süreli animasyon
hiç çalışmıyordu.

Genişlik zaten bir **düzen** meselesi, animasyon değil. Artık `style` ile
veriliyor ve yumuşak geçiş CSS `transition-[width]` ile yapılıyor. Etiketlerin
belirip kaybolması framer'da kaldı — orası gerçekten bir giriş/çıkış animasyonu.

> Doğrulama 375 / 768 / 1440px'de yapıldı: yatay taşma yok, alt çubuk yalnızca
> md altında, sidebar 768'de 76px ve 1440'ta 268px. Tarayıcı emülasyonunda
> **canlı** yeniden boyutlandırma `matchMedia change` ve `window resize`
> olaylarını yaymıyor (ikisi de 0 kez tetiklendi), bu yüzden breakpoint
> geçişleri her boyutta yeniden yükleyerek sınandı; gerçek cihazda ekran
> döndürmede bu olaylar tetiklenir.

## Performans

Ölçüm önce yapıldı, sonra dokunuldu. Bulgular (Supabase projesi uzak bölgede):

| Ne | Süre |
| -- | ---- |
| Saf ağ turu (boş istek) | **42 ms** |
| `auth/v1/user` çağrısı | 78 ms |
| `listings` 46 satır `select *` | 146 ms |
| `listings` tek satır `head count` | 183 ms |
| 12 ardışık sorgu | 1345 ms |
| 12 paralel sorgu | 336 ms |

**Kritik gözlem:** 46 satır getirmek, tek bir sayı getirmekten yavaş değil.
Maliyet veride değil, **istek sayısında**. Bu yüzden "kayıtları azaltmak" bir
çözüm değil — 46 ilanın 32'ye inmesi hiçbir şeyi değiştirmez.

Yapılanlar:

| Değişiklik | Kazanç |
| ---------- | ------ |
| `getUser()` istek başına `cache()` — `getSession` ve `getCurrentAgent` aynı turu paylaşıyor | ~78 ms/istek |
| Dashboard'ın 6 ayrı `listings` sorgusu tek sorguya indi (`getListingFacts`) | 223 → 114 ms |
| `getSalesTimeSeries` `cache()` — dashboard'da iki yerden isteniyordu | 1 tur |
| `getCustomerStats` 2 sorgu → 1 (`length` zaten sayıyı veriyor) | 1 tur |
| Sayfalarda `getCurrentAgent()` artık veriyle paralel, önünde değil | ~190 ms/sayfa |
| `getCustomers` dar kolon seçimi (`notes` taşınmıyor) | 30 → 18 KB |
| [`0005_rls_performance.sql`](supabase/migrations/0005_rls_performance.sql) | aşağıya bakın |

Dashboard'ın toplam gidiş-dönüşü **~17'den ~9'a** indi.

### RLS politikaları neden `(select …)` içinde

`using (public.is_manager() or …)` biçimindeki bir politika **her satır için**
yeniden çalışır ve her çağrı `agents` tablosuna bir alt sorgudur. Fonksiyon
çağrısını `(select …)` içine almak Postgres'in onu bir InitPlan olarak
görmesini sağlıyor: sorgu başında bir kez hesaplanıp sabit gibi kullanılıyor.
Supabase'in kendi RLS performans rehberindeki kalıp budur ve **semantik
değişmez** — yalnızca değerlendirme sayısı değişir.

`owns_listing(id)` / `owns_customer(id)` bilinçli olarak sarmalanmadı: onlar
satırın kendi kimliğini argüman alıyor, gerçekten satır başına
değerlendirilmeleri gerekiyor. Sabit olan yalnızca "ben kimim" sorusu.

### Neden `select *` daraltılmadı (ilanlarda)

Ölçüldü: `listings select *` 113 ms, kartın kullandığı 14 kolon 109 ms. Fark
4 ms, yük 44 KB. Bu ölçekte ağ turu her şeyi domine ediyor; tipleri daraltmanın
karmaşıklığı kazanca değmiyor. `customers` daraltıldı çünkü orada `notes`
alanı yükün üçte birini tek başına taşıyordu ve daraltma tip düzeyinde
zaten temiz çıktı.

### En büyük etken: geliştirme modu

`npm run dev` her route'u ilk isteğinde derler. Kayıtlardan bir örnek:
**`/evraklar` 3.3 saniye sürdü** — o sayfa tek bir veritabanı sorgusu bile
yapmayan statik bir "yakında" ekranı. Süre tamamen derlemeydi.

Gerçek hızı görmek için:

```bash
npm run build && npm start
```

Üretim derlemesinde route derlemesi yoktur; geriye yalnızca yukarıda ölçülen
veri turları kalır.

## Test kapsamı

```bash
npm test          # tek seferlik
npm run test:watch
```

239 test, 13 dosya, ~1,1 sn. Vitest; jsdom yok, veritabanı yok, Docker yok.

| Dosya | Ne koruyor |
| ----- | ---------- |
| `lib/calendar.test.ts` | Sabit UTC+3 çevrimi, hafta/ay ızgarası, çakışma yerleşimi, sürükleme yuvarlaması |
| `lib/appointments.test.ts` | Randevu durum geçişleri, beş kategorinin beş ayrı renk alması, çizelge olayı eşlemesi |
| `lib/offers.test.ts` | Teklif→satış geçiş kuralları; sunulan her düğmenin gerçekten geçerli bir geçiş olması |
| `lib/agents.test.ts` | Yetki yüklemleri; bağlanmamış kullanıcının yetki almaması |
| `lib/storage/paths.test.ts` | `parseStorageUrl` — seed adreslerini bizimkilerden ayırması |
| `lib/data/stats.test.ts` | Ay sınırı ve trend hesapları |
| `lib/format.test.ts` | Locale/saat dilimi sabitliği, `formatRelativeTime` referans parametresi |
| `lib/chart.test.ts` | Kütüphanesiz SVG üretiminin kenar durumları |
| `lib/schemas.test.ts` | zod form kuralları ve DB'ye giden dönüşümler |
| `lib/filters.test.ts` | URL ayrıştırıcıları — "bozuk parametre filtreyi düşürmez" |
| `lib/messaging.test.ts` | Dosya adından belge türü tahmini (Türkçe küçültme dahil), bildirim adres çözümü, evrak filtresi ayrıştırıcısı |
| `lib/badges.test.ts` | Rozet eşikleri ve sıralaması; jsonb tercihlerin bozuk veride varsayılana düşmesi |
| `lib/revenue.test.ts` | Komisyon çarpımı ve bozuk girdide 0'a düşmesi, tahsilat geçişleri, dönem yedeği |

### Neden yalnızca saf fonksiyonlar

Kapsam bilinçli olarak dar. Buradaki fonksiyonların ortak özelliği: **girdi ve
çıktıdan ibaret olmaları, ama yanlış giderlerse sessizce yanlış gitmeleri.**
Bir prim yanlış hesaplanırsa kimse fark etmez; bir ay sınırı kayarsa dashboard
makul ama yanlış bir sayı gösterir. Tam da test edilmesi gereken sınıf.

Kapsam dışında bıraktıklarımız ve nedenleri:

- **RLS politikaları** — gerçek anlamda sınamak için canlı bir Postgres ve en az
  üç farklı rolde oturum gerekir (Docker'da yerel Supabase ya da ayrı bir test
  projesi). Ayrı bir karar; şimdilik `_verify-*.ts` tarzı elle çalıştırılan
  doğrulama script'leriyle karşılanıyor.
- **Server action'lar** — Supabase istemcisinin sahtelenmesini gerektirir ve o
  sahte, sınadığını iddia ettiği şeyin (PostgREST davranışı) kendisi olmaz.
  Geçiş KURALI saf fonksiyona ayrıldığı için asıl mantık zaten test altında.
- **React bileşenleri ve `use-filter-params`** — jsdom + router sahteleme
  ister. Hook'un saf olan kısmı (parametre → filtre nesnesi) `*-filters.ts`
  içinde ve test ediliyor.

> İlk çalıştırmada test bir hata yakaladı: `parseSaleFilters`, `?from=2026-13-01`
> gibi geçersiz bir ay verildiğinde `Invalid Date` üzerinde `toISOString()`
> çağırıp `RangeError` fırlatıyordu — yani elle düzenlenmiş bir link satış
> sayfasını hata ekranına düşürürdü. Projenin kendi "bozuk parametre filtreyi
> düşürmez" kuralının ihlaliydi.

## Görsel yükleme (Supabase Storage)

Faz 7'ye kadar fotoğraf yükleme **sahteydi ve sessizce bozuyordu**: dosya
`URL.createObjectURL()` ile `blob:http://localhost:3000/…` adresine çevrilip
doğrudan `listings.images` kolonuna yazılıyordu. Blob adresi sekmeye bağlı,
sekme kapanınca ölüyor — formdan eklenen her ilanın görselleri kalıcı olarak
kırıktı. Artık dosyalar gerçekten Storage'a gidiyor.

| Katman | Dosya |
| ------ | ----- |
| Bucket + politika | [`0003_storage.sql`](supabase/migrations/0003_storage.sql) |
| Adres şeması, sınırlar | [`lib/storage/paths.ts`](src/lib/storage/paths.ts) |
| Yükleme (tarayıcı) | [`lib/storage/upload.ts`](src/lib/storage/upload.ts) |
| Temizlik (sunucu) | [`lib/storage/cleanup.ts`](src/lib/storage/cleanup.ts) |
| Çoklu görsel | `components/listings/image-dropzone.tsx` |
| Tek portre | `components/storage/avatar-upload.tsx` |

### Neden iki public bucket, private + imzalı URL değil

`listings` ve `avatars`, ikisi de public. Private bucket seçilseydi her okuma
için sunucu tarafında bir imzalama adımı ve süresi dolan URL'leri yenileme
mantığı gerekirdi: ilan listesi 46 kartla açılıyor, her kart bir kapak görseli
istiyor — 46 imza, her sayfa yüklemesinde. Bunun karşılığında kazanılacak şey
bu projede yok: ilan fotoğrafları zaten portala çıkacak, demo portresi olarak
duran müşteri görselleri de gerçek kişilere ait değil.

Kararın sınırı net: **gerçek müşteri fotoğrafları taşıyan bir kuruluma
geçilirse `avatars` private'a çevrilmeli.** O noktada değişmesi gereken tek
yer `parseStorageUrl` / `publicUrlFor` ikilisi ve okuma noktalarında imzalı URL
üretimi; yükleme ve temizlik akışları aynı kalır. Politikalar da hazır —
`emlak_storage_public_read` bucket private olunca kendiliğinden anlamını
yitirir, kaldırılması yeterli.

### Neden dosya yolu düz ve UUID bazlı

Şema `<bucket>/<uuid>.<ext>` — klasör hiyerarşisi yok. Sebep bir tercih değil,
bir zorunluluk: **dosya, ilgili kayıt daha var olmadan yükleniyor.** İlan
kimliği (`iln-1102`) veritabanındaki diziden INSERT anında geliyor; kullanıcı
fotoğrafı sürüklediğinde ortada henüz bir ilan yok. `listings/<ilan_id>/…`
şeması ancak "önce taslak klasöre yükle, kayıttan sonra taşı" akışıyla
kurulabilirdi ve o akış yarıda bırakılan her formda çöp bırakırdı.

Bunun bir bedeli var ve kabul edildi: **bir Storage nesnesinin hangi ilana ait
olduğu politika seviyesinde bilinemiyor.** `storage.objects` üzerinde yalnızca
`bucket_id`, `name` ve `owner` var. Bu yüzden yetki kapsamı YÜKLEYENE bağlandı
(`owner = auth.uid() or is_manager()`): bir danışman kendi yüklediği dosyaları
yönetir, yönetici hepsini. Kaybedilen tek durum, devralınan bir ilanın
başkasınca yüklenmiş fotoğrafını danışmanın silememesi — o dosya yöneticiye
kalıyor.

### Silme cascade'i nerede tetikleniyor

Storage **yabancı anahtar cascade'ine dahil değil**: ilan satırı silinince
`customer_listing_interests` ve `activity_log` satırları veritabanı tarafından
temizlenir, ama `listings.images` içindeki dosyalar bucket'ta kalır. Zincirin
son halkası bu yüzden uygulama tarafında, üç noktada:

| Nokta | Ne siliniyor | Dosya |
| ----- | ------------ | ----- |
| `updateListing` | Formdan çıkarılan fotoğraflar (`removeUnusedObjects`) | `actions/listings.ts` |
| `deleteListing` | İlanın tüm görselleri — satır silinmeden **önce** okunur | `actions/listings.ts` |
| `updateCustomer` · `updateAgentAvatar` | Değiştirilen ya da kaldırılan portre | `actions/customers.ts` · `actions/agents.ts` |

İki davranış bilinçli:

1. **Dropzone'dan "kaldır" Storage'a dokunmaz.** Kullanıcı formu kaydetmeden
   vazgeçebilir; o durumda dosyanın durması gerekir. Silme ancak kaydetme
   anında, kalıcı hale gelen listeye bakılarak yapılır.
2. **Silme hatası kullanıcının işlemini bozmaz.** `removeStorageObjects`
   istisna fırlatmaz, sunucu günlüğüne yazar. "İlan silindi ama fotoğrafı
   silinemedi" kullanıcı için bir başarısızlık değil; tersi olsaydı bucket'taki
   geçici bir sorun ilan silmeyi engellerdi.

Seed görselleri (`picsum.photos`, `i.pravatar.cc`) bu akıştan etkilenmez:
`parseStorageUrl` bizim bucket'ımızda olmayan her adrese `null` döner, yani
silme onları görmez bile.

### Sıkıştırma ve sınırlar

Telefon fotoğrafları 5–12 MB ve 4000+ piksel geliyor; ekranda en fazla 1200
piksel gösteriliyor. Yükleme öncesi tarayıcıda canvas ile uzun kenar 2000 px'e
indiriliyor ve WebP'ye (kalite 0.82) çevriliyor — tipik olarak 6 MB → 250-400
KB. Sıkıştırma başarısız olursa dosya olduğu gibi yüklenir; bir iyileştirme,
bir kapı değil.

Sınır iki yerde: istemcide anlaşılır hata mesajı için, **bucket seviyesinde ise
gerçek kapı olarak** (8 MB, `image/jpeg|png|webp`). İstemci kontrolü
atlatılabilir, bucket sınırı atlatılamaz.

> **Yükleme neden server action değil, tarayıcıdan?** Server action gövdesi
> varsayılan olarak 1 MB ile sınırlı; dosya Next sunucusuna gidip oradan
> Storage'a çıkardı (aynı baytlar iki kez) ve gerçek ilerleme göstergesi
> mümkün olmazdı. Yetkilendirme kaybı yok — yükleme kullanıcının oturum
> jetonuyla yapılıyor, `storage.objects` politikaları aynen geçerli.
>
> **İlerleme neden XHR ile?** `@supabase/storage-js` fetch üzerine kurulu ve
> fetch'in yükleme ilerlemesi olayı yok. Gerçek bayt ilerlemesi için tek yol
> `XMLHttpRequest.upload.onprogress`.

## Tasarım sistemi

Tüm token'lar [`src/app/globals.css`](src/app/globals.css) içinde tanımlıdır:
ham değerler `:root` altında, Tailwind utility eşlemesi `@theme inline` içinde.
**Component'lerde ham hex yazmayın**, semantic utility kullanın.

### Yüzeyler

| Token             | Değer     | Kullanım                     |
| ----------------- | --------- | ---------------------------- |
| `bg-canvas`       | `#0B0F19` | Uygulama arka planı          |
| `bg-canvas-subtle`| `#0E131F` | Sidebar / navbar             |
| `bg-surface`      | `#151B26` | Kart yüzeyi                  |
| `bg-surface-hover`| `#1B2230` | Kart hover — hafif aydınlanma|
| `bg-surface-active`| `#212A3A`| Basılı / seçili              |
| `bg-surface-inset`| `#0F1522` | Input, well                  |

### Diğer

- **Metin:** `text-foreground` · `text-secondary-foreground` · `text-muted-foreground`
- **Kenarlık:** `border-hairline` · `border-hairline-strong`
- **Marka:** `bg-brand` · `bg-brand-soft` · `text-violet`
- **Durum:** `success` · `warning` · `danger` (+ `-soft` varyantları)
- **Grafik:** `--chart-1` → `--chart-5` (marka mavisinden başlayan seri
  paleti) · `--chart-grid` ızgara çizgisi
- **Yarıçap:** `rounded-lg` 16px (buton/input) · `rounded-xl` 20px (kart) ·
  `rounded-2xl` 24px (modal)
- **Gölge:** `shadow-xs` → `shadow-lg`, ince ve yumuşak
- **Spacing:** 8px grid — çift adımlar kullanın (`2`=8, `4`=16, `6`=24, `8`=32)
- **Easing:** `ease-[var(--ease-out-quint)]` standart geçiş eğrisi

### Kompozit utility'ler

`surface-card` (kart tabanı) · `surface-card-interactive` (hover aydınlanması) ·
`glass` (blur + yarı saydam) · `hairline-top` (üst ışık çizgisi) ·
`text-gradient`

### shadcn/ui uyumluluk katmanı

`@theme inline` içinde shadcn'in sözlüğü (`background`, `card`, `primary`,
`accent`, `border`, `input`…) bizim token'larımıza bağlanmıştır. Bu sayede
`npx shadcn@latest add <component>` çıktısı stilsiz kalmaz.
**Kendi kodunuzda yine semantic isimleri kullanın** (`bg-surface`,
`border-hairline`, `bg-brand`); eşleme yalnızca köprüdür.

## Oturum

`middleware.ts` login ve `/auth/*` dışındaki tüm yolları korur; oturum yoksa
`/login?next=<yol>` adresine yönlendirir.

Faz 2'de bu dosyanın başında şu not vardı: *"Supabase Auth'a geçerken yalnızca
bu dosya değişir."* Sınandı, tuttu — `Session` tipini kullanan taraflar
(navbar, kullanıcı kartı, dashboard karşılama başlığı) dokunulmadan çalıştı.

Üç dosya kimlik doğrulamayı taşır:

| Dosya | Sorumluluk |
| ----- | ---------- |
| [`lib/auth/session.ts`](src/lib/auth/session.ts) | Edge-safe. `updateSession(request)` oturumu **doğrular ve tazeler**, tazelenmiş çerezleri taşıyan bir `NextResponse` döndürür |
| [`lib/auth/server.ts`](src/lib/auth/server.ts) | Sunucu bileşenleri için `getSession()` · `getCurrentAgent()` · `getManagerAgent()` (`next/headers` kullanır, middleware'den import edilemez) |
| [`lib/auth/client.ts`](src/lib/auth/client.ts) | `signInWithPassword` · `signInWithProvider` · `signOut` |

İki ayrıntı kolay gözden kaçıyor:

1. **`getUser()`, `getSession()` değil.** İkincisi çerezdeki JWT'ye olduğu gibi
   güvenir; yetkilendirme kararı vereceğimiz için Supabase'e doğrulatılanı
   kullanıyoruz.
2. **Yönlendirmede çerezler kopyalanmalı.** Jeton süresi dolmuşsa Supabase
   onu tazeler ve yeni çerezleri yazması gerekir; middleware yönlendirme
   yaparken bu çerezleri yeni yanıta taşımazsa kullanıcı her tazelemede bir kez
   login ekranına düşer.

OAuth kodu `/auth/callback` route handler'ında oturuma çevrilir — sunucu
bileşenleri çerez yazamaz, bu yüzden route handler. `next` parametresi açık
yönlendirmeye karşı doğrulanır (`//evil.com` reddedilir).

**Oturum → personel.** `getCurrentAgent()` giriş yapan kullanıcının `agents`
satırını getirir ve `Session` tipine `agentId` / `agentRole` alanlarını doldurur;
navbar'daki unvan, form varsayılanları ve sayfa yetki kapıları bunu okur.
Fonksiyon React'in `cache()` sarmalıyla **istek başına bir kez** çalışır — bir
sayfa çiziliyorken layout, sayfa ve yetki kapısı aynı soruyu üç kez soruyor.
Middleware bu alanları dolduramaz (sorgu yapamaz) ve doldurmasına gerek de yok:
oradaki tek soru "oturum var mı".

**Arayüz kontrolü RLS'in yerine geçmez, yanına gelir.** RLS veriyi korur, arayüz
kontrolü kullanıcıya yapamayacağı şeyi teklif etmez. Yalnızca ilki olsaydı
tıklayınca hata veren düğmeler; yalnızca ikincisi olsaydı kozmetik bir güvenlik
olurdu.

## Modül deseni (İlanlar örneği)

İlanlar modülü diğer modüllerin şablonudur. Yeni bir modül yazarken aynı
katmanlamayı izleyin:

| Katman | Dosya | Sorumluluk |
| ------ | ----- | ---------- |
| Tip | `types/database.ts` | Satır tiplerine uygulama adı verir; kolonlar `types/supabase.ts` içinde |
| Okuma | `lib/data/<modül>.ts` | `async get…(filters)` — Supabase sorguları |
| Yazma | `lib/actions/<modül>.ts` | Server action'lar; sonuç nesnesi döner |
| Sözlük | `lib/<modül>.ts` | Etiketler, rozet renkleri, filtre seçenekleri |
| Şema | `lib/<modül>-schema.ts` | zod doğrulama + form → DB dönüşümü |
| URL state | `hooks/use-filter-params.ts` | Filtreler arama parametresinde tutulur |
| Sayfa | `app/(app)/<modül>/page.tsx` | Sunucu bileşeni, `searchParams` okur |

Uyulması gereken üç kural:

1. **Filtre state'i URL'de durur.** Link paylaşılabilir, geri tuşu çalışır,
   sunucu bileşeni veriyi doğrudan URL'den okur.
2. **Sonuç listesi `<Suspense>` içine alınır** ve anahtarı arama
   parametreleriyle değişir — böylece her filtre değişiminde iskelet görünür.
3. **Server action `redirect()` çağırmaz, sonuç nesnesi döner.** `redirect()`
   bir istisna fırlatır ve action orada biter; istemci başarılı mı hatalı mı
   olduğunu öğrenemez, Sonner bildirimi her durumda iyimser çıkardı.
   Yönlendirmeyi istemci yapar. Ayrıntı: [`lib/actions/result.ts`](src/lib/actions/result.ts)

## Dashboard ve grafikler

`/dashboard` veri katmanını tüketir; ayrı bir kaynağı yoktur. Uyulması gereken
üç kural:

1. **Aggregate hesabı veri katmanında yapılır.** `getListingStats()`,
   `getListingsByCategory()`, `getListingsByStatus()`, `getPortfolioTotals()`,
   `getSalesTimeSeries()`, `getRecentActivity()` — sayfa hiçbir toplama
   yapmaz, yalnızca sunuma çevirir.
2. **Tarih pencereleri `Date.now()`'a bağlıdır.** Faz 3-4'te sabit bir
   `DATA_EPOCH` vardı çünkü veri her istekte yeniden üretiliyordu; artık veri
   kalıcı ve "bu ay", "son 30 gün", "3 dakika önce" gerçek saate göre
   hesaplanıyor. `formatRelativeTime` referans anını **parametre olarak
   ister** — varsayılan olsaydı bir istemci bileşeni onu render sırasında
   okur ve sunucudaki değerden şaşıp hydration uyuşmazlığı üretirdi.
3. **Grafikler harici kütüphanesiz SVG.** `lib/chart.ts` ölçek, path ve halka
   dilimi üretir; Recharts/Chart.js bundle'a 80–150 kB ekleyeceği için
   kurulmadı. Renkler CSS değişkenidir, JS'te hex tutulmaz.

Bölümler ayrı `<Suspense>` sınırlarındadır (KPI'lar önce, grafikler sonra
akar) ama veri çekimleri paralel başlar; bir bölüm içindeki birden fazla
sorgu `Promise.all` ile toplanır.

## Ortak veri katmanı

**Kural:** iki modülün ortak parçası ikisinden de bağımsız bir dosyada durur.

| Dosya | Neden ortak |
| ----- | ----------- |
| `data/query.ts` | `{ data, error }` açıcıları; hata sessizce yutulursa boş liste gibi görünür |
| `data/stats.ts` | `StatMetric`, `percentChange`, aya göre sayım |
| `data/agents.ts` | Personel — İlanlar, Müşteriler ve Personeller modülleri bağlı |
| `lib/agents.ts` | Rol etiketleri + `isManagerRole()`; hem sunucu hem istemci tarafından kullanılır |
| `components/agents/agent-field.tsx` | İki formun da kullandığı danışman alanı — rol davranışı tek yerde |
| `lib/search-params.ts` | URL filtre ayrıştırıcıları; kopyalansaydı iki modül farklı davranırdı |
| `lib/actions/result.ts` | Server action sonuç sözleşmesi + Postgres hata kodu çevirisi |

`data/seed.ts` **silindi** — tohumlu üretim yardımcıları ve `DATA_EPOCH`
Faz 5'te gereksiz kaldı. Aynı mantık `scripts/seed-supabase.ts` içinde
yaşamaya devam ediyor, ama artık uygulama koduna değil tek seferlik seed
işlemine ait ve `src/` altından hiçbir şey import etmiyor.

Faz 4'teki `customers → listings` bağımlılığı da kalktı: ilişki artık
veritabanında, iki modül birbirini tanımıyor.

### Neden aggregate'ler hâlâ JavaScript'te

Trend ve dağılım hesapları bir RPC ile SQL tarafına inebilir
(`date_trunc`, `count(*) filter (where …)`), ama o RPC'nin dönüş tipi elle
bakımı gereken ikinci bir sözleşme demek. Veri kümesi 46 ilan ve 64 müşteri;
trend için çekilen tek kolon birkaç kilobayt. Tablolar on binlere çıktığında
bu gövdeler bir `rpc()` çağrısına dönüşecek — **imzaları o zaman da
değişmeyecek**, tıpkı bu fazda olduğu gibi.

### Şema generic'i

Faz 5'te bu başlık "istemciye neden generic verilmedi"ydi. Faz 6'da verildi.

[`types/supabase.ts`](src/types/supabase.ts) `supabase gen types typescript`
çıktı biçiminde şemanın makine okunur karşılığıdır ve üç istemcinin de generic
parametresidir (`supabase/client.ts`, `supabase/server.ts`,
`auth/session.ts`). Kazanç somut:

- Tablo ve kolon adları, filtre değerleri, `insert`/`update` gövdeleri derleme
  zamanında denetleniyor.
- `data/query.ts` içindeki `as T[]` dönüşümleri **kalktı**. `rows<Listing>(…)`
  artık bir dönüşüm değil bir doğrulama — yanlış tabloyu sorgularsanız derlenmez.
- İç içe gömme (`agent:agents(*)`) ve ilişki sayımı (`interests:…(count)`)
  çıkarımı `Relationships` bloklarından geliyor; takma adlı select'ler
  (`type:event_type`) de doğru çözülüyor.

Generic devreye alınır alınmaz ilk hatayı `data/agents.ts` verdi: sorgu altı
kolon seçiyor ama dönüş tipi tam `Agent` olarak bildiriliyordu. Tam olarak
yakalanması istenen hata sınıfı.

**Tek bilinçli sapma.** Şemada enum yok, sınırlı değer kümeleri CHECK kısıtıyla
tutuluyor; üretici CHECK'i göremediği için o kolonları düz `string` yazar.
Dokuz kolonda birlik tipleri elle daraltıldı (liste dosyanın başında).
`npm run gen:types` çıktıyı `supabase.generated.ts` dosyasına yazar — üzerine
yazmaz — böylece daraltmalar sessizce kaybolmaz.

> Üretici bir kişisel erişim jetonu ister
> (`SUPABASE_ACCESS_TOKEN`, supabase.com/dashboard/account/tokens). Jeton
> kurulu değilken de proje çalışır: dosya elle, üreticinin çıktı biçimine sadık
> kalınarak yazıldı.

## ESLint

Kurallar Next.js'in kendi paketinden gelir —
[`eslint.config.mjs`](eslint.config.mjs) içinde `next/core-web-vitals`
(React Hooks + erişilebilirlik + Next'e özgü performans) ve
`next/typescript` (typescript-eslint önerilen set) genişletilir. Kendi
eklediğimiz tek kural `no-unused-vars`'ın `_` önekli değişkenleri
bağışlaması.

> `eslint-config-next` sürümü Next sürümüyle **aynı majörde** tutulmalıdır;
> varsayılan kurulum 16.x getiriyor ve 15.5 üzerinde beklenmedik kurallar
> uyguluyor.

## Menü ve route ekleme

[`src/config/navigation.ts`](src/config/navigation.ts) tek kaynaktır — sidebar,
navbar başlığı, komut paleti ve empty state metinleri buradan beslenir.
Yeni bölüm eklerken:

1. `navigation` dizisine `NavItem` ekleyin (`href`, `label`, `icon`, `description`).
2. `src/app/(app)/<slug>/page.tsx` oluşturun. Veri çeken bir sayfaysa yanına
   `loading.tsx` de ekleyin (ortak parçalar: `components/page-skeletons.tsx`).
   Hata sınırı gerekmiyor — `(app)/error.tsx` bütün grubu kapsıyor.

## Henüz yapılmayanlar

- **Ofis/ekip kapsamı** — `ofis_muduru` şu an patronla aynı kapsamı görüyor;
  ayrışması `offices` tablosu + `agents.office_id` ister (ayrıntı yukarıda)
- **Müşteri silme** — ilan modülünde var, müşteri modülünde yok
- **Görüşmeye ilan bağlama** — kayıt eklenebiliyor ama `listing_id` alanı
  formda yok; hangi ilan için görüşüldüğü seçilemiyor
- **Geçmişe dönük görüşme kaydı** — `occurred_at` her zaman `now()`; dün
  yapılan bir görüşmeyi bugün girmek için tarih seçici gerekiyor
- **Teklif geri alma** — kabul edilen teklif terminal; satışı iptal edip ilanı
  yeniden yayına almak için ayrı bir "satış iptali" akışı gerekiyor
- **Randevu hatırlatması** — `appointments.reminder_sent` kolonu var ama onu
  yazan hiçbir şey yok: uygulamada zamanlanmış iş (cron) ya da e-posta gönderimi
  bulunmuyor
- **Tekrarlayan randevu** — her kayıt tek seferlik; haftalık/aylık tekrar için
  ayrı bir seri kavramı gerekiyor
- **Dokunmatikte sürükle-bırak** — kapalı; gerekçe "Randevular" bölümünde
- **Randevu süresini sürükleyerek değiştirme** — sürükleme taşıma yapıyor,
  süreyi koruyor; kenardan tutup uzatma yok, süre formdan değişiyor
- **RLS testleri** — canlı veritabanı isteyen ayrı bir karar (yukarıya bakın)
- **Otomatik aktivite kaydı** — müşteri oluşturma, teklif, satış kapanışı ve
  randevu `activity_log`'a yazar; ilan oluşturma/güncelleme yazmaz
- **Aktivite akışı canlı değil** — Realtime yalnızca mesajlar ve bildirimler
  için bağlı (gerekçe yukarıda); dashboard akışı sayfa yenilenince güncellenir
- **Müşteri tarafı mesajlaşma yok** — `messages.sender_type` `'customer'`
  değerini destekliyor ama müşterilerin gireceği bir arayüz yok; gelen mesaj
  şimdilik ancak elle ya da seed ile kaydediliyor
- **Belge sürümleme** — bir belgenin yeni sürümü yeni kayıt olarak giriyor;
  "v2" ilişkisi tutulmuyor
- **Bildirim e-postası / push** — bildirimler yalnızca uygulama içinde
- **Gelirler ve Raporlar** — menüde duran son iki "yakında" ekranı; ikisi de
  mevcut `sales` / `offers` verisinden beslenebilir ama kendi fazları olmadı
- **İki adımlı doğrulama** — Supabase TOTP'yi destekliyor; giriş akışına ikinci
  adım eklenmesi gerekiyor (gerekçe "Ayarlar ve Profil" bölümünde)
- **API anahtarı yönetimi** — üretme, özetleyerek saklama, kapsam, iptal ve
  kullanım kaydı; kendi başına bir modül
- **E-posta değiştirme** — `agents.email` ile `auth.users.email` ayrı yaşıyor;
  değişim Supabase'in doğrulama akışını gerektiriyor
- **Açık tema** — token'ların ikinci seti gerekiyor (gerekçe "Ayarlar ve
  Profil" bölümünde). *Dil bu listeden çıktı: Faz 19–25'te tamamlandı.*
- **Buton metni kontrastı** — beyaz metin `--brand` üzerinde 3.7:1; düzeltmek
  buton dolgusu için ayrı bir token açmayı gerektiriyor (ölçüm Faz 15'te)
- **Görsel kırpma / sıralama sürükleyerek** — kapak seçimi yıldız düğmesiyle
  yapılıyor, sürükle-bırak sıralama ve kırpma aracı yok
- **Harita** — `ListingMap` şematik bir yer tutucudur; formda koordinat seçici
  olmadığı için elle eklenen ilanların konumu boştur
- **Mobil form akışı** — uzun formlar mobilde çalışıyor ama adım göstergesi
  yok; bölümler arası gezinme kaydırmaya bırakılmış durumda
- Açık tema · çoklu dil (UI hazır, işlevsiz)
