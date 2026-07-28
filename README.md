# Emlak CRM

Gayrimenkul ekipleri için premium CRM arayüzü.

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

Uygulamada artık mock veri yoktur; her şey Supabase'den gelir. Yüklenen
fotoğraflar Supabase Storage'da durur.

## Kurulum

### 1. Bağımlılıklar

```bash
npm install
```

### 2. Ortam değişkenleri

`.env.local` dosyası üç değer bekler:

```
NEXT_PUBLIC_SUPABASE_URL=https://<proje>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

İlk ikisi Supabase Dashboard > Project Settings > API Keys altındadır ve
tarayıcıya gider — gitmesi gerekir, veriyi koruyan şey anahtarın gizliliği
değil **RLS politikalarıdır**. Üçüncüsü (secret / service_role) RLS'i atlar,
**yalnızca seed script'i** kullanır ve asla `NEXT_PUBLIC_` öneki almamalıdır.

### 3. Şema

Migration dosyalarını **sırayla** Supabase Dashboard > SQL Editor'a yapıştırıp
çalıştırın. İkisi de idempotenttir; tekrar çalıştırmak zarar vermez.

| Dosya | İçerik |
| ----- | ------ |
| [`0001_init.sql`](supabase/migrations/0001_init.sql) | Sekiz tablo, index, `updated_at` trigger'ları, açık RLS politikaları |
| [`0002_agents_auth_link.sql`](supabase/migrations/0002_agents_auth_link.sql) | `agents.user_id` / `role` / `title` / `commission_rate`, oturum yardımcı fonksiyonları, **rol bazlı RLS** |
| [`0003_storage.sql`](supabase/migrations/0003_storage.sql) | `listings` + `avatars` bucket'ları, boyut/tip sınırı, `storage.objects` politikaları |
| [`0004_offers_unique_pending.sql`](supabase/migrations/0004_offers_unique_pending.sql) | Bir müşteri–ilan çifti için tek bekleyen teklif (kısmi unique indeks) |
| [`0005_rls_performance.sql`](supabase/migrations/0005_rls_performance.sql) | Politikalardaki fonksiyon çağrıları `(select …)` içine alındı — semantik aynı, satır başına değil sorgu başına değerlendirme |
| [`0006_agent_management.sql`](supabase/migrations/0006_agent_management.sql) | `agents.is_active`, pasif personelin yetkisini kesen fonksiyonlar, `agent_audit_log` |
| [`0007_appointments.sql`](supabase/migrations/0007_appointments.sql) | `appointments` tablosu, aralık indeksleri, `updated_at` trigger'ı, rol bazlı RLS |

0002 çalışırken `NOTICE` satırları basar (`agt-1 -> erden@test.com baglandi`
gibi) — bunlar hata değil, ne yapıldığının raporu.

### 4. Demo veri

```bash
npm run seed
```

[`scripts/seed-supabase.ts`](scripts/seed-supabase.ts) tabloları temizler ve
46 ilan, 64 müşteri, ilgi kayıtları, görüşme geçmişleri, 12 aylık satış serisi,
teklifler ve aktivite akışını yazar. Script `node --env-file=.env.local` ile
çalışır — ek bir TypeScript çalıştırıcısı kurulu değildir, Node 24 `.ts`
dosyalarını doğrudan çalıştırır.

**Tarih çapası script'in çalıştığı andır.** Seed'i bugün çalıştırırsanız
"3 dakika önce", "bu ay" ve "son 30 gün" bugüne göre okunur. Demo tazeliğini
kaybederse seed'i tekrar çalıştırmak yeterlidir.

### 5. Test kullanıcısı

Supabase Dashboard > Authentication > Users > **Add user** ile bir kullanıcı
oluşturun ("Auto Confirm User" işaretli olsun, yoksa e-posta doğrulaması
beklenir). Giriş bilgilerinizi buraya not edin:

```
E-posta : erden@test.com
Şifre   : ____________________
```

> Test kullanıcısı bilinçli olarak seed script'ine dahil edilmedi: kullanıcı
> oluşturmak Auth Admin API'si ister ve bir parolanın repoya yazılması
> gerekirdi.

**Hesap ↔ personel bağı.** Giriş yapan kişinin bir `agents` satırıyla
ilişkilendirilmesi zorunludur: RLS `agents.user_id = auth.uid()` üzerinden
çalışır, bağ yoksa uygulama **bomboş** açılır (arayüz bunu bir uyarı kutusuyla
söyler). `erden@test.com` adresi hem migration 0002'de hem de her `npm run seed`
çalıştırmasında `agt-1` (Selin Kaya · **patron**) kaydına bağlanır. Başka bir
e-posta kullanacaksanız iki yerde de değiştirin:

- `supabase/migrations/0002_agents_auth_link.sql` → `umail` değişkeni
- `scripts/seed-supabase.ts` → `TEST_USER_EMAIL` sabiti

**Danışman rolünü denemek için** kendi kaydınızın rolünü geçici olarak
düşürün, sayfayı yenileyin, sonra geri alın:

```sql
update public.agents set role = 'danisman' where id = 'agt-1';
-- geri: update public.agents set role = 'patron' where id = 'agt-1';
```

Google ve Apple girişleri için Supabase Dashboard > Authentication >
Providers altında ilgili sağlayıcıyı Client ID + Secret ile etkinleştirmeniz
gerekir (Google Cloud Console / Apple Developer hesabından alınır). Kod
tarafı hazırdır; sağlayıcı kapalıyken butona basılırsa arayüz
"bu giriş yöntemi henüz etkinleştirilmemiş" der.

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
│   │   └── <8 route>/      # raporlar, evraklar… (henüz ComingSoon)
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

Ölçüt basit: **gerçekten çalışan modüller.** Menüdeki 13 öğenin sekizi hâlâ
"yakında" ekranı; kullanıcıyı boş bir sayfaya götüren kısayol koymak o slotu
çöpe atmak olurdu. Sahadaki kullanım da bunu doğruluyor — danışman telefonda ya
portföyüne bakar, ya müşterisine, ya günün programına, ya rakamlara.

Faz 9'da dört öğe vardı; Faz 11'de Randevular çalışır hale gelince beşe çıktı.
Sıra da buna göre: takvim, sahadaki bir danışmanın telefonda en sık açtığı
ekranlardan biri, Satışlar ise masa başı işi ve en sağda.

Beş öğe + çekmece, 375px'de hücre başına ~62px bırakıyor; en uzun etiket
("Randevular") 57px. Sığıyor ama payı yok, o yüzden etikete `truncate` eklendi:
320px'lik bir telefonda etiket çubuğu taşırmak yerine kısalıyor.

Adresler `config/navigation.ts` içinde duruyor ama **öğelerin kendisi değil**:
etiket, ikon ve rozet yine aynı `navigation` dizisinden çözülüyor. Alt çubuk ve
çekmece için ayrı bir menü listesi yazılmadı — 13 öğe iki yerde tutulsaydı biri
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

187 test, 10 dosya, ~0,9 sn. Vitest; jsdom yok, veritabanı yok, Docker yok.

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
2. `src/app/(app)/<slug>/page.tsx` oluşturup `<ComingSoon href="/<slug>" />` döndürün.

## Henüz yapılmayanlar

- **Ofis/ekip kapsamı** — `ofis_muduru` şu an patronla aynı kapsamı görüyor;
  ayrışması `offices` tablosu + `agents.office_id` ister (ayrıntı yukarıda)
- **Şifre değiştirme ekranı** — davet edilen personel geçici şifreyle giriş
  yapıyor ama Ayarlar'da şifre değiştirme formu henüz yok
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
- **Otomatik aktivite kaydı** — yalnızca müşteri oluşturma `activity_log`'a
  yazar; ilan oluşturma/güncelleme yazmaz
- **Aktivite akışı canlı değil** — Supabase Realtime bağlı değil, sayfa
  yenilenince güncellenir
- **Görsel kırpma / sıralama sürükleyerek** — kapak seçimi yıldız düğmesiyle
  yapılıyor, sürükle-bırak sıralama ve kırpma aracı yok
- **Harita** — `ListingMap` şematik bir yer tutucudur; formda koordinat seçici
  olmadığı için elle eklenen ilanların konumu boştur
- **Mobil form akışı** — uzun formlar mobilde çalışıyor ama adım göstergesi
  yok; bölümler arası gezinme kaydırmaya bırakılmış durumda
- Açık tema · çoklu dil (UI hazır, işlevsiz)
