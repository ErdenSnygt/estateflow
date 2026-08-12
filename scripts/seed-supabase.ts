/**
 * ============================================================================
 * SUPABASE SEED — demo veriyi kalıcı hale getirir
 * ============================================================================
 * Çalıştırma:  npm run seed
 *
 * Faz 4'e kadar bu üretim mantığı `src/lib/data/*` içinde yaşıyordu ve her
 * istekte yeniden çalışıyordu. Faz 5'te veri Supabase'e taşındı; mantık bir kez
 * BURADA çalışıp veritabanına yazılıyor, uygulama artık yalnızca okuyor.
 * Bu yüzden dosya bilinçli olarak kendi kendine yeter: `src/` altından hiçbir
 * şey import etmez, silinen `lib/data/seed.ts` yardımcılarını kendi içinde
 * taşır. Uygulama kodu bu dosyaya bağımlı DEĞİLDİR.
 *
 * Neden servis anahtarı gerekiyor: tablolarda RLS açık ve politikalar yalnızca
 * `authenticated` rolüne yazma izni veriyor. Seed bir kullanıcı oturumu
 * olmadan çalıştığı için RLS'i atlayan servis anahtarına ihtiyaç duyar.
 *
 * TARİH ÇAPASI: her şey script'in çalıştığı ana göre üretilir. Faz 4'teki sabit
 * DATA_EPOCH kaldırıldı — artık gerçek veri var ve arayüz `Date.now()`'a göre
 * "3 dakika önce" diyor. Seed'i bugün çalıştırırsanız demo bugüne göre taze
 * görünür.
 */

import { createClient } from "@supabase/supabase-js";

/* ==========================================================================
   0. Bağlantı
   ========================================================================== */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error(
    "\n  ✖ NEXT_PUBLIC_SUPABASE_URL bulunamadı. .env.local dosyasını kontrol edin.\n",
  );
  process.exit(1);
}

if (!secret) {
  console.error(
    [
      "",
      "  ✖ Servis anahtarı bulunamadı.",
      "",
      "    Supabase Dashboard > Project Settings > API Keys altındaki",
      "    secret / service_role anahtarını .env.local dosyasına ekleyin:",
      "",
      "      SUPABASE_SECRET_KEY=sb_secret_...",
      "",
      "    Bu anahtar RLS'i atlar; asla NEXT_PUBLIC_ öneki verilmemeli ve",
      "    tarayıcıya gönderilmemelidir.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ==========================================================================
   1. Tohumlu üretim yardımcıları   (eski src/lib/data/seed.ts)
   ========================================================================== */

/** Script'in çalıştığı an — tüm tarihler buna göre üretilir. */
const NOW = Date.now();
const DAY = 86_400_000;

type Random = () => number;

/** Ardışık indeksler benzer diziler üretmesin diye tohumu karıştırır. */
function hashSeed(value: number) {
  let hash = value + 0x9e3779b9;
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  return (hash ^ (hash >>> 15)) >>> 0;
}

function mulberry32(seed: number): Random {
  let state = seed;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const pick = <T,>(random: Random, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];

const between = (random: Random, min: number, max: number) =>
  min + random() * (max - min);

const intBetween = (random: Random, min: number, max: number) =>
  Math.floor(between(random, min, max + 1));

/** Ağırlıklı seçim — [değer, ağırlık] çiftleri. */
function weighted<T>(
  random: Random,
  entries: readonly (readonly [T, number])[],
): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = random() * total;
  for (const [value, weight] of entries) {
    threshold -= weight;
    if (threshold <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Değerleri piyasada görülen yuvarlak sayılara çeker. */
const roundTo = (value: number, step: number) =>
  Math.round(value / step) * step;

/** Tekrarsız seçim — aynı öğe iki kez gelmesin. */
function sampleUnique<T>(random: Random, items: readonly T[], count: number) {
  const pool = [...items];
  const picked: T[] = [];
  const size = Math.min(count, pool.length);

  for (let i = 0; i < size; i += 1) {
    const index = Math.floor(random() * pool.length);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }

  return picked;
}

const iso = (value: number) => new Date(value).toISOString();

/* ==========================================================================
   2. agents
   ========================================================================== */

/**
 * Faz 6'da iki alan eklendi ve biri yeniden adlandırıldı:
 *
 *   role → title        görünen unvan (serbest metin)
 *   role                yetki rolü ('patron' | 'ofis_muduru' | 'danisman')
 *   commission_rate     prim oranı; prim = kapanan satış × bu oran
 *
 * Ayrımın gerekçesi `supabase/migrations/0002_agents_auth_link.sql` başlığında.
 */
type AgentRole = "patron" | "ofis_muduru" | "danisman";

type AgentRow = {
  id: string;
  full_name: string;
  initials: string;
  title: string;
  role: AgentRole;
  email: string;
  phone: string;
  commission_rate: number;
  /** Supabase Auth kullanıcısı; aşağıda test hesabıyla eşleştiriliyor. */
  user_id: string | null;
};

/* Ekipte her rolden en az bir kişi var: rol bazlı yetkilendirmenin etkisi
   ancak böyle görünür hale geliyor. Prim oranı kıdemle birlikte yükseliyor. */
const agents: AgentRow[] = [
  { id: "agt-1", full_name: "Selin Kaya",   initials: "SK", title: "Kurucu Ortak",             role: "patron",      email: "selin.kaya@emlakofisi.com",   phone: "+90 532 114 22 08", commission_rate: 0.035, user_id: null },
  { id: "agt-2", full_name: "Mert Doğan",   initials: "MD", title: "Ofis Müdürü",              role: "ofis_muduru", email: "mert.dogan@emlakofisi.com",   phone: "+90 533 207 41 19", commission_rate: 0.030, user_id: null },
  { id: "agt-3", full_name: "Ayşe Yılmaz",  initials: "AY", title: "Gayrimenkul Danışmanı",    role: "danisman",    email: "ayse.yilmaz@emlakofisi.com",  phone: "+90 555 318 76 43", commission_rate: 0.025, user_id: null },
  { id: "agt-4", full_name: "Burak Şen",    initials: "BŞ", title: "Gayrimenkul Danışmanı",    role: "danisman",    email: "burak.sen@emlakofisi.com",    phone: "+90 542 690 05 27", commission_rate: 0.020, user_id: null },
  { id: "agt-5", full_name: "Deniz Aktaş",  initials: "DA", title: "Kiralama Uzmanı",          role: "danisman",    email: "deniz.aktas@emlakofisi.com",  phone: "+90 536 442 89 15", commission_rate: 0.020, user_id: null },
  { id: "agt-6", full_name: "Emre Korkmaz", initials: "EK", title: "Ticari Portföy Uzmanı",    role: "danisman",    email: "emre.korkmaz@emlakofisi.com", phone: "+90 549 771 63 90", commission_rate: 0.025, user_id: null },
];

/**
 * Seed'in test hesabıyla eşleştireceği personel.
 *
 * NEDEN GEREKLİ: `npm run seed` `agents` tablosunu tamamen siliyor, yani
 * `0002_agents_auth_link.sql` içinde kurulan `user_id` bağı her seed'de
 * kopardı. Bağ kopunca `current_agent_id()` null döner ve RLS giriş yapan
 * kullanıcıya HİÇBİR satır göstermez — uygulama seed sonrası bomboş açılırdı.
 * Bu yüzden bağ burada yeniden kuruluyor.
 *
 * Yeni bir kayıt açmak yerine mevcut bir danışmanla eşleştiriliyor: portföyü
 * olmayan bir hesapla giriş yapmak demoyu boş gösterirdi.
 */
const TEST_USER_EMAIL = "erden@test.com";
const TEST_USER_AGENT_ID = "agt-1";

async function linkTestUser() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });

  if (error) {
    console.log(`  ! Auth kullanıcıları okunamadı (${error.message}).`);
    return;
  }

  const user = data.users.find(
    (candidate) => candidate.email?.toLowerCase() === TEST_USER_EMAIL,
  );

  const agent = agents.find((candidate) => candidate.id === TEST_USER_AGENT_ID);
  if (!agent) return;

  if (!user) {
    console.log(
      `  ! ${TEST_USER_EMAIL} bulunamadı; ${TEST_USER_AGENT_ID} bir hesaba bağlanmadı.\n` +
        "    Dashboard > Authentication > Users altından oluşturup seed'i tekrar çalıştırın.",
    );
    return;
  }

  agent.user_id = user.id;
  agent.email = TEST_USER_EMAIL;
  console.log(`  ✓ ${TEST_USER_AGENT_ID} → ${TEST_USER_EMAIL} (patron)`);
}

/* ==========================================================================
   3. listings
   ========================================================================== */

type ListingCategory = "satilik" | "kiralik" | "arsa" | "villa" | "ofis";
type ListingStatus = "aktif" | "pasif" | "taslak" | "satildi";

type ListingRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  area_sqm: number;
  room_count: number;
  category: ListingCategory;
  status: ListingStatus;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  images: string[];
  views_count: number;
  favorites_count: number;
  published_at: string | null;
  agent_id: string;
  created_at: string;
  updated_at: string;
};

type DistrictProfile = {
  city: string;
  district: string;
  neighborhoods: string[];
  /** Satılık konut ₺/m². */
  salePerSqm: [number, number];
  /** Kiralık konut aylık ₺/m². */
  rentPerSqm: [number, number];
  lat: number;
  lng: number;
};

const DISTRICTS: DistrictProfile[] = [
  // --- İstanbul ---
  { city: "İstanbul", district: "Sarıyer", neighborhoods: ["Tarabya", "Yeniköy", "Maslak", "Emirgan"], salePerSqm: [160_000, 320_000], rentPerSqm: [700, 1_300], lat: 41.167, lng: 29.05 },
  { city: "İstanbul", district: "Beşiktaş", neighborhoods: ["Etiler", "Levent", "Bebek", "Ortaköy"], salePerSqm: [150_000, 300_000], rentPerSqm: [650, 1_200], lat: 41.043, lng: 29.008 },
  { city: "İstanbul", district: "Kadıköy", neighborhoods: ["Moda", "Caferağa", "Fenerbahçe", "Suadiye"], salePerSqm: [110_000, 220_000], rentPerSqm: [480, 900], lat: 40.99, lng: 29.03 },
  { city: "İstanbul", district: "Şişli", neighborhoods: ["Nişantaşı", "Mecidiyeköy", "Bomonti", "Fulya"], salePerSqm: [95_000, 190_000], rentPerSqm: [420, 820], lat: 41.06, lng: 28.987 },
  { city: "İstanbul", district: "Bakırköy", neighborhoods: ["Ataköy", "Yeşilköy", "Florya"], salePerSqm: [90_000, 175_000], rentPerSqm: [400, 780], lat: 40.98, lng: 28.872 },
  { city: "İstanbul", district: "Üsküdar", neighborhoods: ["Kuzguncuk", "Acıbadem", "Altunizade", "Çengelköy"], salePerSqm: [85_000, 165_000], rentPerSqm: [380, 720], lat: 41.023, lng: 29.015 },
  { city: "İstanbul", district: "Ataşehir", neighborhoods: ["Barbaros", "Küçükbakkalköy", "Ataşehir Merkez"], salePerSqm: [80_000, 150_000], rentPerSqm: [350, 680], lat: 40.992, lng: 29.127 },
  { city: "İstanbul", district: "Maltepe", neighborhoods: ["Bağlarbaşı", "Cevizli", "Küçükyalı"], salePerSqm: [60_000, 115_000], rentPerSqm: [260, 500], lat: 40.935, lng: 29.156 },
  { city: "İstanbul", district: "Zeytinburnu", neighborhoods: ["Merkezefendi", "Kazlıçeşme", "Veliefendi"], salePerSqm: [65_000, 125_000], rentPerSqm: [290, 540], lat: 40.994, lng: 28.902 },
  { city: "İstanbul", district: "Eyüpsultan", neighborhoods: ["Alibeyköy", "Göktürk", "Kemerburgaz"], salePerSqm: [50_000, 95_000], rentPerSqm: [220, 420], lat: 41.048, lng: 28.934 },
  { city: "İstanbul", district: "Beylikdüzü", neighborhoods: ["Cumhuriyet", "Gürpınar", "Adnan Kahveci"], salePerSqm: [45_000, 85_000], rentPerSqm: [200, 380], lat: 40.982, lng: 28.641 },
  { city: "İstanbul", district: "Pendik", neighborhoods: ["Kaynarca", "Yenişehir", "Çamçeşme"], salePerSqm: [40_000, 78_000], rentPerSqm: [180, 340], lat: 40.877, lng: 29.234 },
  // --- Ankara ---
  { city: "Ankara", district: "Çankaya", neighborhoods: ["Çukurambar", "Oran", "Bilkent", "Kavaklıdere"], salePerSqm: [70_000, 135_000], rentPerSqm: [300, 580], lat: 39.908, lng: 32.854 },
  { city: "Ankara", district: "Yenimahalle", neighborhoods: ["Batıkent", "Demetevler", "Şentepe"], salePerSqm: [42_000, 82_000], rentPerSqm: [190, 360], lat: 39.97, lng: 32.76 },
  { city: "Ankara", district: "Keçiören", neighborhoods: ["Etlik", "Sanatoryum", "Aşağı Eğlence"], salePerSqm: [35_000, 68_000], rentPerSqm: [160, 300], lat: 40.017, lng: 32.87 },
  // --- İzmir ---
  { city: "İzmir", district: "Karşıyaka", neighborhoods: ["Bostanlı", "Mavişehir", "Alaybey"], salePerSqm: [75_000, 145_000], rentPerSqm: [330, 620], lat: 38.46, lng: 27.11 },
  { city: "İzmir", district: "Bornova", neighborhoods: ["Kazımdirik", "Evka 3", "Erzene"], salePerSqm: [50_000, 95_000], rentPerSqm: [220, 420], lat: 38.47, lng: 27.22 },
  { city: "İzmir", district: "Çeşme", neighborhoods: ["Alaçatı", "Ilıca", "Dalyan"], salePerSqm: [120_000, 260_000], rentPerSqm: [520, 1_050], lat: 38.323, lng: 26.305 },
];

/** İstanbul ağırlıklı havuz — veri gerçek bir ofis portföyü gibi dağılsın. */
const DISTRICT_POOL: DistrictProfile[] = DISTRICTS.flatMap((profile) =>
  profile.city === "İstanbul" ? [profile, profile, profile] : [profile],
);

const ADJECTIVES: Record<ListingCategory, readonly string[]> = {
  satilik: [
    "Deniz Manzaralı", "Site İçinde Güvenlikli", "Sıfır Binada", "Metroya Yürüme Mesafesinde",
    "Geniş Balkonlu", "Bahçe Katı", "Otoparklı", "Asansörlü Yeni Bina",
    "Ferah ve Aydınlık", "Yüksek Giriş", "Güney Cepheli", "Ebeveyn Banyolu",
  ],
  kiralik: [
    "Full Eşyalı", "Site İçinde", "Metroya 5 Dakika", "Yeni Boyalı",
    "Beyaz Eşyalı", "Ara Kat", "Otoparklı", "Balkonlu",
    "Aydınlık Cepheli", "Öğrenciye Uygun",
  ],
  villa: [
    "Havuzlu Müstakil", "Boğaz Manzaralı", "Bahçeli Triplex", "Doğayla İç İçe",
    "Site İçinde Lüks", "Özel Havuzlu", "Deniz Manzaralı Dubleks",
  ],
  arsa: [
    "İmarlı", "Yola Cepheli", "Köşe Parsel", "Villa İmarlı",
    "Yatırımlık", "Denize Yakın", "Konut İmarlı",
  ],
  ofis: [
    "Plaza İçinde", "Cadde Üzeri", "Hazır Kurulu", "Kurumsal Kullanıma Uygun",
    "Yüksek Katta", "Açık Ofis Düzeninde", "Vitrinli",
  ],
};

const HOUSING_NOUNS = ["Daire", "Daire", "Dubleks", "Rezidans Dairesi"] as const;

const DESCRIPTION_OPENERS = [
  "Bölgenin en işlek noktasında, ulaşım akslarına yakın konumda.",
  "Sakin bir sokakta, komşuluk ilişkileri güçlü bir muhitte yer alıyor.",
  "Çevresinde okul, market ve sağlık kuruluşları yürüme mesafesinde.",
  "Yeni yapılaşmanın hızlandığı, değer kazanan bir bölgede.",
] as const;

const DESCRIPTION_FEATURES = [
  "Doğalgaz kombi ısıtma sistemi mevcuttur.",
  "Bina kapalı otoparka ve 7/24 güvenliğe sahiptir.",
  "Islak hacimler yakın zamanda yenilenmiştir.",
  "Site içerisinde açık havuz, fitness salonu ve çocuk oyun alanı bulunmaktadır.",
  "Cephe yalıtımı yapılmış olup ısı kaybı düşüktür.",
  "Geniş teras kullanımı ve manzara hakimiyeti öne çıkıyor.",
] as const;

const DESCRIPTION_CLOSERS = [
  "Detaylı bilgi ve yerinde inceleme için ofisimizle iletişime geçebilirsiniz.",
  "Randevu ile gezilebilir; portföy danışmanımız size eşlik edecektir.",
  "Krediye uygundur, tapu ve iskân işlemleri tamamlanmıştır.",
  "Pazarlık payı bulunmaktadır, ciddi alıcılar dikkate alınacaktır.",
] as const;

/* ==========================================================================
   İlan görselleri
   ========================================================================== */
/**
 * KATEGORİYE GÖRE SEÇİLMİŞ GERÇEK GAYRİMENKUL FOTOĞRAFLARI.
 *
 * -----------------------------------------------------------------------------
 * NEDEN RASTGELE GÖRSEL SERVİSİ DEĞİL
 * -----------------------------------------------------------------------------
 * Önceki sürüm `picsum.photos/seed/<ilan-id>/1200/800` kullanıyordu. Adres
 * ilan kimliğinden türediği için görsel KARARLIYDI (aynı ilan hep aynı
 * fotoğrafı gösteriyordu) ama picsum'un bir kategori kavramı yok: "1+1
 * Dubleks" ilanının kapağında kahve çekirdeği, "1.620 m² Arsa" ilanında
 * dizüstü bilgisayar çıkıyordu.
 *
 * Bir emlak uygulamasında bu, tek bakışta fark edilen ve tüm ekranı
 * inandırıcılıktan düşüren bir kusur — üstelik veri katmanının değil yalnızca
 * seed'in sorunu.
 *
 * `source.unsplash.com/?apartment` gibi anahtar kelimeli servisler bunu
 * çözerdi ama o uç 2024'te kapandı (503 dönüyor). Bu yüzden havuzlar ELLE
 * seçildi: aşağıdaki kimliklerin her biri Unsplash CDN'inden tek tek çekilip
 * içeriği doğrulandı.
 *
 * -----------------------------------------------------------------------------
 * DAİRE HAVUZU NEDEN İÇ MEKÂN AĞIRLIKLI
 * -----------------------------------------------------------------------------
 * Bir apartman dairesinin dış cephesi ayırt edici değil — İstanbul'da kırk
 * ilan aynı beton bloğu gösterirdi. Alıcının baktığı şey salon, mutfak ve
 * banyo. Villa ve ofiste tersi: orada bina karakterin kendisi.
 */
const IMAGE_POOLS: Record<ListingCategory, readonly string[]> = {
  /* `satilik` ve `kiralik` aynı havuzu paylaşıyor: bir dairenin fotoğrafı
     satılık mı kiralık mı olduğuna göre değişmiyor. */
  satilik: [
    "1502005229762-cf1b2da7c5d6", // çift katlı salon, merdiven
    "1493809842364-78817add7ffb", // lacivert kanepeli oturma odası
    "1586023492125-27b2c045efd7", // sarı koltuklu salon
    "1522708323590-d24dbb6b0267", // salon + yemek alanı
    "1560448204-e02f11c3d0e2", // ferah oturma odası
    "1484154218962-a197022b5858", // beyaz mutfak, ada tezgâh
    "1556909212-d5b604d0c90d", // mutfak, kırmızı detay
    "1600607687939-ce8a6c25118c", // modern salon
    "1600566753086-00f18fb6b3ea", // salon + iç merdiven
    "1600210492486-724fe5c67fb0", // bitkili oturma odası
    "1600607687920-4e2a09cf159d", // yemek masası, ahşap
    "1512918728675-ed5a9ecdebfd", // yatak odası
    "1519643381401-22c77e60520e", // yemek odası
    "1598928506311-c55ded91a20c", // klasik salon
    "1502672260266-1c1ef2d93688", // bitkili köşe
    "1522771739844-6a9f6d5f14af", // yatak odası, gece lambası
    "1554995207-c18c203602cb", // salon, yeşil duvar
    "1584622650111-993a426fbf0a", // banyo
    "1560185007-cde436f6a4d0", // cumbalı yemek alanı
    "1560185893-a55cbc8c57e8", // yatak odası
    "1600585152220-90363fe7e115", // mutfak adası, tabure
    "1600573472550-8090b5e0745e", // salon, havuz manzarası
    "1600566752355-35792bedcfea", // banyo, küvet
    "1615874959474-d609969a20ed", // yatak odası
    "1615529182904-14819c35db37", // salon, hasır detay
    "1631679706909-1844bbd07221", // bej salon
    "1600121848594-d8644e57abab", // gri salon
    "1567767292278-a4f21aa2d36e", // beyaz salon
    "1516455590571-18256e5bb9ff", // yemek alanı
    "1604328698692-f76ea9498e76", // aydınlık daire
    "1604014237800-1c9102c219da", // açık plan salon
    "1590725140246-20acdee442be", // çatı katı mutfak
    "1600585154084-4e5fe7c39198", // şömineli salon
    "1600566752229-250ed79470f8", // beyaz mutfak
    "1523217582562-09d0def993a6", // modern bina dış cephe
    "1600585154526-990dced4db0d", // bina dış cephe
    "1600047509807-ba8f99d2cdde", // bina dış cephe
    "1505873242700-f289a29e1e0f", // loft, endüstriyel
  ],
  kiralik: [], // aşağıda `satilik` havuzuna bağlanıyor

  villa: [
    "1512917774080-9991f1c4c750",
    "1600596542815-ffad4c1539a9",
    "1570129477492-45c003edd2be",
    "1600585154340-be6161a56a0c",
    "1449844908441-8829872d2607",
    "1416331108676-a22ccb276e35",
    "1564013799919-ab600027ffc6",
    "1568605114967-8130f3a36994",
    "1580587771525-78b9dba3b914",
    "1613490493576-7fde63acd811",
    "1600566753190-17f0baa2a6c3",
    "1600607688969-a5bfcd646154",
    "1600047509358-9dc75507daeb",
    "1613977257363-707ba9348227",
    "1591474200742-8e512e6f98f8",
    "1600566753376-12c8ab7fb75b",
    "1464146072230-91cabc968266",
    "1592595896551-12b371d546d5",
    "1613977257592-4871e5fcd7c4",
    "1571055107559-3e67626fa8be",
    "1600585153490-76fb20a32601",
  ],

  ofis: [
    "1497366754035-f200968a6e72", // cam bölmeli koridor
    "1497366811353-6870744d04b2", // toplantı odası
    "1487958449943-2429e8be8625", // gökdelen
    "1486406146926-c627a92ad1ab", // gökdelenler
    "1497366216548-37526070297c", // açık ofis
    "1497215842964-222b430dc094", // çalışma masası
    "1524758631624-e2822e304c36", // ofis dinlenme alanı
    "1541746972996-4e0b0f43e02a", // cam duvarlı toplantı
    "1497366858526-0766cadbe8fa", // toplantı masası
    "1497215728101-856f4ea42174", // pencereli çalışma alanı
    "1518005020951-eccb494ad742", // kavisli cephe
    "1596541223130-5d31a73fb6c6", // ofis binası, sokak
    "1554435493-93422e8220c8", // cam ofis binası
  ],

  /* Arsa havuzu en dar olan: boş parsel fotoğrafı stok arşivlerde nadir ve
     çoğu manzara fotoğrafına dönüşüyor. Buradakiler bilinçli olarak ARAZİ
     okunacak kareler — tarla, çitli parsel, kuşbakışı yerleşim. Orman, plaj
     ve karlı dağ gibi "duvar kâğıdı" fotoğraflar elendi: onlar da en az kahve
     çekirdeği kadar alakasız olurdu. */
  arsa: [
    "1500382017468-9049fed747ef", // gün doğumunda tarla
    "1444858291040-58f756a3bdd6", // çitli yeşil arazi, ahır
    "1501854140801-50d01698950b", // kuşbakışı yeşil tepeler
    "1560493676-04071c5f467b", // sıralı ekili tarla
    "1524813686514-a57563d77965", // kuşbakışı yerleşim, parseller
    "1470071459604-3b5ec3a7fe05", // yol geçen yeşil vadi
  ],
};

/* Kiralık, satılık havuzunu aynen kullanıyor. Ayrı diziler tutmak aynı
   listeyi iki kez bakımda tutmak olurdu. */
const POOL_FOR = (category: ListingCategory): readonly string[] =>
  category === "kiralik" ? IMAGE_POOLS.satilik : IMAGE_POOLS[category];

/**
 * Bir ilanın görsel adresleri.
 *
 * KAPAK BENZERSİZ: `index` doğrudan havuzun başlangıç noktası olduğu için
 * aynı kategorideki ardışık ilanlar farklı kapaklarla açılıyor. Liste
 * sayfasında yan yana duran iki kartın aynı fotoğrafı göstermesi, veriyi
 * sahte gösteren şeylerden biri.
 *
 * Sonraki kareler havuzda dönerek ilerliyor (`% length`), yani tek bir ilanın
 * içinde tekrar yok.
 */
function imagesFor(
  category: ListingCategory,
  index: number,
  count: number,
): string[] {
  const pool = POOL_FOR(category);
  return Array.from({ length: count }, (_, offset) => {
    const id = pool[(index + offset) % pool.length];
    /* `fit=crop` sabit en-boy oranı veriyor: kart ızgarası her görselde aynı
       yüksekliği bekliyor. `q=80` ve `auto=format` Unsplash'in kendi
       optimizasyonu — WebP destekleyen tarayıcıya WebP gidiyor. */
    return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&h=800&q=80`;
  });
}

/**
 * Kategoriler rastgele değil, sabit bir kotayla dağıtılır: 46 kayıtta
 * ağırlıklı seçim villa/arsa gibi küçük dilimleri 1-2 kayda düşürüyor ve
 * kategori filtresi neredeyse boş sonuç veriyordu.
 */
const CATEGORY_PLAN: ListingCategory[] = [
  ...Array<ListingCategory>(16).fill("satilik"),
  ...Array<ListingCategory>(12).fill("kiralik"),
  ...Array<ListingCategory>(6).fill("villa"),
  ...Array<ListingCategory>(6).fill("ofis"),
  ...Array<ListingCategory>(6).fill("arsa"),
];

function buildListing(index: number): ListingRow {
  const random = mulberry32(hashSeed(index));

  const profile = pick(random, DISTRICT_POOL);
  const neighborhood = pick(random, profile.neighborhoods);
  const category = CATEGORY_PLAN[index];

  /* --- Alan ve oda --- */
  let roomCount = 0;
  let areaSqm = 0;

  if (category === "satilik" || category === "kiralik") {
    roomCount = weighted<number>(random, [[1, 15], [2, 30], [3, 32], [4, 17], [5, 6]]);
    areaSqm = Math.round(45 + roomCount * 28 + between(random, 0, 40));
  } else if (category === "villa") {
    roomCount = intBetween(random, 4, 6);
    areaSqm = Math.round(between(random, 180, 400));
  } else if (category === "ofis") {
    areaSqm = Math.round(between(random, 60, 400));
  } else {
    areaSqm = Math.round(between(random, 300, 2_500) / 10) * 10;
  }

  /* --- Fiyat: bölge bandı × alan --- */
  const salePerSqm = between(random, ...profile.salePerSqm);
  const rentPerSqm = between(random, ...profile.rentPerSqm);

  let price: number;
  if (category === "kiralik") {
    price = roundTo(areaSqm * rentPerSqm, 500);
  } else if (category === "villa") {
    price = roundTo(areaSqm * salePerSqm * 1.15, 100_000);
  } else if (category === "arsa") {
    price = roundTo(areaSqm * salePerSqm * 0.22, 50_000);
  } else if (category === "ofis") {
    price = roundTo(areaSqm * salePerSqm * 1.05, 50_000);
  } else {
    price = roundTo(areaSqm * salePerSqm, 50_000);
  }

  /* --- Durum ve tarihler --- */
  const status = weighted<ListingStatus>(random, [
    ["aktif", 62], ["taslak", 13], ["satildi", 13], ["pasif", 12],
  ]);

  const ageDays = intBetween(random, 0, 180);
  const createdAt = NOW - ageDays * DAY;
  const publishedAt = status === "taslak" ? null : createdAt + 2 * DAY;
  const updatedAt = NOW - Math.max(0, ageDays - intBetween(random, 0, 20)) * DAY;

  /* --- Etkileşim: yaşlı ve aktif ilanlar daha çok görüntülenir --- */
  const viewsCount =
    status === "taslak"
      ? 0
      : Math.round(between(random, 40, 320) + ageDays * between(random, 3, 14));
  const favoritesCount =
    status === "taslak" ? 0 : Math.round(viewsCount * between(random, 0.02, 0.08));

  /* --- Metin --- */
  const adjective = pick(random, ADJECTIVES[category]);
  const title =
    category === "arsa" || category === "ofis"
      ? `${adjective} ${areaSqm} m² ${category === "arsa" ? "Arsa" : "Ofis"}`
      : category === "villa"
        ? `${adjective} ${roomCount}+1 Villa`
        : `${adjective} ${roomCount}+1 ${pick(random, HOUSING_NOUNS)}`;

  const description = [
    `${neighborhood} bölgesinde ${areaSqm} m² ${category === "arsa" ? "arsa" : "kullanım alanı"}.`,
    pick(random, DESCRIPTION_OPENERS),
    pick(random, DESCRIPTION_FEATURES),
    pick(random, DESCRIPTION_CLOSERS),
  ].join(" ");

  const id = `iln-${1001 + index}`;

  return {
    id,
    title,
    description,
    price,
    currency: "TRY",
    area_sqm: areaSqm,
    room_count: roomCount,
    category,
    status,
    city: profile.city,
    district: profile.district,
    address: `${neighborhood} Mah. ${intBetween(random, 1, 120)}. Sok. No:${intBetween(random, 1, 60)}`,
    // Mahalle dağılımını taklit etmek için ilçe merkezine küçük sapma
    latitude: Number((profile.lat + between(random, -0.018, 0.018)).toFixed(6)),
    longitude: Number((profile.lng + between(random, -0.022, 0.022)).toFixed(6)),
    images: imagesFor(category, index, intBetween(random, 4, 6)),
    views_count: viewsCount,
    favorites_count: favoritesCount,
    published_at: publishedAt === null ? null : iso(publishedAt),
    agent_id: agents[index % agents.length].id,
    created_at: iso(createdAt),
    updated_at: iso(updatedAt),
  };
}

const listings: ListingRow[] = Array.from(
  { length: CATEGORY_PLAN.length },
  (_, index) => buildListing(index),
);

/* ==========================================================================
   4. customers
   ========================================================================== */

type CustomerStatus = "sicak" | "normal" | "soguk";

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string | null;
  budget_min: number;
  budget_max: number;
  status: CustomerStatus;
  assigned_agent_id: string;
  notes: string;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
};

const FIRST_NAMES = [
  "Zeynep", "Hakan", "Elif", "Onur", "Merve", "Serkan", "Pelin", "Kaan",
  "Ceren", "Barış", "Gizem", "Tolga", "Sinem", "Yusuf", "Ebru", "Cem",
  "Aslı", "Murat", "Damla", "Volkan", "Şeyma", "İlker", "Buse", "Ozan",
  "Nihan", "Erkan", "Melis", "Tuncay", "Gamze", "Sercan", "Aysun", "Bora",
  "Dilek", "Ufuk", "Esra", "Koray", "Nazlı", "Alper", "Tuğçe", "Kerem",
] as const;

const LAST_NAMES = [
  "Arslan", "Yıldırım", "Demir", "Çetin", "Kılıç", "Aydın", "Ateş", "Öztürk",
  "Şahin", "Polat", "Erdoğan", "Kurt", "Özdemir", "Aksoy", "Tekin", "Yalçın",
  "Bulut", "Güneş", "Kaplan", "Turan", "Sezer", "Ergin", "Duman", "Coşkun",
  "Bilgin", "Uçar", "Sarı", "Taş", "Keskin", "Avcı",
] as const;

const OPERATOR_PREFIXES = [
  "530", "531", "532", "533", "534", "535", "536", "537", "538", "539",
  "541", "542", "543", "544", "545", "546", "505", "506", "507", "551",
  "552", "553", "555",
] as const;

const EMAIL_DOMAINS = [
  "gmail.com", "hotmail.com", "outlook.com", "yandex.com", "icloud.com",
] as const;

const NOTE_INTENT = [
  "Kadıköy ve Üsküdar tarafında, metroya yürüme mesafesinde arıyor.",
  "Yatırım amaçlı bakıyor; kira getirisi önceliği.",
  "Çocukların okuluna yakınlık şart, site içi olması tercih sebebi.",
  "İlk ev alımı, kredi kullanacak.",
  "Mevcut evini satıp büyütmek istiyor.",
  "Şirketi için ofis arıyor, cadde üzeri olmasını istiyor.",
  "Emeklilik planı için sakin bir muhit arıyor.",
  "Uzun vadeli yatırım, imarlı arsa öncelikli.",
] as const;

const NOTE_DETAIL = [
  "Nakit alıcı, hızlı kapanış yapabilir.",
  "Kredi ön onayı alındı, peşinat hazır.",
  "Eşiyle birlikte karar veriyor; yalnızca hafta sonu gezebiliyor.",
  "Otopark ve güvenlik olmazsa olmaz.",
  "Kirada oturuyor, sözleşmesi üç ay içinde bitiyor.",
  "Fiyat konusunda esnek değil, bütçe üstüne çıkmıyor.",
  "Ara kat ve güney cephe tercih ediyor.",
  "Yurt dışında yaşıyor, görüşmeler telefonla yürüyor.",
] as const;

const TURKISH_MAP: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", I: "i",
};

/** "Şeyma Öztürk" → "seyma.ozturk" */
function toEmailLocal(fullName: string) {
  return fullName
    .toLocaleLowerCase("tr-TR")
    .split("")
    .map((char) => TURKISH_MAP[char] ?? char)
    .join("")
    .replace(/\s+/g, ".");
}

const CUSTOMER_COUNT = 64;

/** Bütçe bantları — İstanbul satılık piyasasıyla tutarlı (₺). */
const BUDGET_BANDS: readonly (readonly [number, number, number])[] = [
  // [alt, üst, ağırlık]
  [2_500_000, 6_000_000, 26],
  [6_000_000, 12_000_000, 34],
  [12_000_000, 25_000_000, 25],
  [25_000_000, 60_000_000, 15],
];

function buildCustomer(index: number, usedNames: Set<string>): CustomerRow {
  const random = mulberry32(hashSeed(index + 7_000));

  /* --- İsim: çakışırsa yeniden çekerek tekrarı önlüyoruz --- */
  let fullName = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`;
  let guard = 0;
  while (usedNames.has(fullName) && guard < 40) {
    fullName = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`;
    guard += 1;
  }
  usedNames.add(fullName);

  /* --- Bütçe --- */
  const band = weighted(
    random,
    BUDGET_BANDS.map((entry) => [entry, entry[2]] as const),
  );
  const budgetMin = roundTo(between(random, band[0], band[1] * 0.7), 250_000);
  const budgetMax = roundTo(budgetMin * between(random, 1.25, 1.85), 250_000);

  const status = weighted<CustomerStatus>(random, [
    ["sicak", 25], ["normal", 45], ["soguk", 30],
  ]);

  /* --- Tarihler: sıcak müşteriyle yakın zamanda görüşülmüş olur --- */
  const ageDays = intBetween(random, 5, 400);
  const createdAt = NOW - ageDays * DAY;

  const contactGapDays =
    status === "sicak"
      ? intBetween(random, 0, 9)
      : status === "normal"
        ? intBetween(random, 6, 45)
        : intBetween(random, 40, 150);

  /* Hiç görüşülmemiş birkaç kayıt bırakıyoruz — arayüz null durumunu da
     göstersin. Son görüşme kayıt tarihinden önce olamaz. */
  const neverContacted = random() < 0.06;
  const lastContactAt = neverContacted
    ? null
    : Math.max(createdAt, NOW - contactGapDays * DAY);

  const phone = `+90 ${pick(random, OPERATOR_PREFIXES)} ${intBetween(random, 100, 999)} ${String(intBetween(random, 0, 99)).padStart(2, "0")} ${String(intBetween(random, 0, 99)).padStart(2, "0")}`;

  return {
    id: `mst-${2001 + index}`,
    full_name: fullName,
    phone,
    email: `${toEmailLocal(fullName)}@${pick(random, EMAIL_DOMAINS)}`,
    /* MÜŞTERİ FOTOĞRAFI YOK — kolon her kayıtta null.
       Önceki sürüm `i.pravatar.cc` üzerinden rastgele portreler yazıyordu.
       Sonuç, gerçek insanların yüzlerinin sahte müşteri kayıtlarına
       iliştirilmesiydi: hem inandırıcı değil (aynı yüzler her demoda
       dolaşıyor) hem de bir CRM'in müşteri listesinde stok portre görmek
       yanlış bir beklenti kuruyor — kimse müşterisinin vesikalığını sisteme
       girmiyor.
       Arayüz artık her yerde baş harf gösteriyor (`CustomerAvatar`). */
    avatar_url: null,
    budget_min: budgetMin,
    budget_max: budgetMax,
    status,
    assigned_agent_id: agents[index % agents.length].id,
    notes: `${pick(random, NOTE_INTENT)} ${pick(random, NOTE_DETAIL)}`,
    last_contact_at: lastContactAt === null ? null : iso(lastContactAt),
    created_at: iso(createdAt),
    updated_at: iso(lastContactAt ?? createdAt),
  };
}

const usedNames = new Set<string>();
const customers: CustomerRow[] = Array.from(
  { length: CUSTOMER_COUNT },
  (_, index) => buildCustomer(index, usedNames),
);

/* ==========================================================================
   5. customer_listing_interests
   ==========================================================================
   Faz 4'te kiralık ilanlar hiçbir müşteriyle eşleşemiyordu: `budget_min/max`
   bir SATIN ALMA bütçesi ve aylık kirayla kıyaslanınca "₺24 Mn bütçeli alıcı
   ₺178 B/ay daireyle ilgileniyor" gibi satırlar çıkıyordu.

   Faz 5'te ilişkinin kendisinde `intent` var. Satın alma ilgisi bütçeyle,
   kiralama ilgisi ise bütçenin aylık karşılığıyla (kabaca %0,3–1,0'i)
   eşleştiriliyor — böylece kiralık ilanların da ilgilenen müşterisi oluyor.
   ========================================================================== */

type InterestRow = {
  customer_id: string;
  listing_id: string;
  intent: "purchase" | "rent";
  created_at: string;
};

function affordsPurchase(customer: CustomerRow, listing: ListingRow) {
  if (listing.category === "kiralik") return false;
  return (
    listing.price >= customer.budget_min * 0.8 &&
    listing.price <= customer.budget_max * 1.1
  );
}

function affordsRent(customer: CustomerRow, listing: ListingRow) {
  if (listing.category !== "kiralik") return false;
  return (
    listing.price >= customer.budget_max * 0.003 &&
    listing.price <= customer.budget_max * 0.010
  );
}

const sellable = listings.filter((listing) => listing.category !== "kiralik");

function buildInterests(): InterestRow[] {
  const rows: InterestRow[] = [];

  customers.forEach((customer, index) => {
    const random = mulberry32(hashSeed(index + 31_000));

    const affordable = listings.filter(
      (listing) => listing.status !== "taslak" && affordsPurchase(customer, listing),
    );
    /* Bütçesine uyan ilan yoksa (dar bant) en yakın fiyatlılara düşüyoruz —
       müşteri hiç ilgisiz kalmasın. */
    const pool =
      affordable.length >= 2
        ? affordable
        : sellable
            .filter((listing) => listing.status !== "taslak")
            .slice()
            .sort(
              (a, b) =>
                Math.abs(a.price - customer.budget_max) -
                Math.abs(b.price - customer.budget_max),
            )
            .slice(0, 6);

    const contactAt = Date.parse(customer.last_contact_at ?? customer.created_at);
    const createdAt = Date.parse(customer.created_at);
    const stamp = () => iso(between(random, createdAt, contactAt));

    for (const listing of sampleUnique(random, pool, intBetween(random, 1, 4))) {
      rows.push({
        customer_id: customer.id,
        listing_id: listing.id,
        intent: "purchase",
        created_at: stamp(),
      });
    }

    /* Müşterilerin yaklaşık üçte biri aynı zamanda kiralık da bakıyor. */
    if (random() < 0.34) {
      const rentable = listings.filter(
        (listing) => listing.status !== "taslak" && affordsRent(customer, listing),
      );
      for (const listing of sampleUnique(random, rentable, intBetween(random, 1, 2))) {
        rows.push({
          customer_id: customer.id,
          listing_id: listing.id,
          intent: "rent",
          created_at: stamp(),
        });
      }
    }
  });

  return rows;
}

const interests = buildInterests();

const interestsByCustomer = new Map<string, string[]>();
for (const row of interests) {
  const list = interestsByCustomer.get(row.customer_id) ?? [];
  list.push(row.listing_id);
  interestsByCustomer.set(row.customer_id, list);
}

/* ==========================================================================
   6. customer_timeline_events
   ========================================================================== */

type CustomerEventType =
  | "created" | "called" | "viewed" | "offer_sent"
  | "negotiation" | "purchased" | "lost";

type TimelineRow = {
  customer_id: string;
  event_type: CustomerEventType;
  description: string;
  listing_id: string | null;
  occurred_at: string;
};

/** Huninin doğal sırası; müşteri durumuna göre farklı derinlikte kesilir. */
const FUNNEL: CustomerEventType[] = ["called", "viewed", "offer_sent", "negotiation"];

const EVENT_NOTES: Record<CustomerEventType, readonly string[]> = {
  created: [
    "Web sitesindeki formdan geldi.",
    "Tavsiye üzerine ofise uğradı.",
    "Portföy ilanına telefonla ulaştı.",
  ],
  called: [
    "İhtiyaçları ve bütçesi konuşuldu.",
    "Uygun ilanlar WhatsApp'tan iletildi.",
    "Görüşme kısa sürdü, tekrar aranacak.",
  ],
  viewed: [
    "Yerinde inceleme yapıldı, olumlu geri dönüş verdi.",
    "Konum beğenildi, kat tercihi sorun oldu.",
    "İkinci kez gezdi, eşini de getirdi.",
  ],
  offer_sent: [
    "Yazılı teklif iletildi, üç gün geçerli.",
    "Pazarlık payı bırakılarak teklif sunuldu.",
  ],
  negotiation: [
    "Fiyatta orta nokta arandı.",
    "Ödeme planı üzerinde konuşuldu.",
  ],
  purchased: [
    "Tapu devri tamamlandı.",
    "Sözleşme imzalandı, süreç kapandı.",
  ],
  lost: [
    "Başka bir ofisten satın aldı.",
    "Bütçe uymadı, süreç askıya alındı.",
  ],
};

function buildTimeline(customer: CustomerRow, index: number): TimelineRow[] {
  const random = mulberry32(hashSeed(index + 55_000));
  const listingIds = interestsByCustomer.get(customer.id) ?? [];

  const depth =
    customer.status === "sicak"
      ? intBetween(random, 3, 4)
      : customer.status === "normal"
        ? intBetween(random, 2, 3)
        : intBetween(random, 1, 2);

  const steps: CustomerEventType[] = ["created", ...FUNNEL.slice(0, depth)];

  /* Sıcak müşterilerin bir kısmı kapanır; soğukların bir kısmı kaybedilir. */
  const roll = random();
  if (customer.status === "sicak" && roll < 0.35) steps.push("purchased");
  else if (customer.status === "soguk" && roll < 0.25) steps.push("lost");

  const start = Date.parse(customer.created_at);
  const end = Date.parse(customer.last_contact_at ?? customer.created_at);
  /* Hiç görüşülmemiş müşteride tek olay vardır: kaydın açılışı. */
  const span = Math.max(end - start, 0);

  return steps.map((type, step) => {
    const progress = steps.length === 1 ? 0 : step / (steps.length - 1);
    const jitter =
      step === 0 || step === steps.length - 1 ? 0 : between(random, -0.04, 0.04);
    const at = start + span * Math.min(Math.max(progress + jitter, 0), 1);

    return {
      customer_id: customer.id,
      event_type: type,
      description: pick(random, EVENT_NOTES[type]),
      listing_id:
        type === "created" || listingIds.length === 0
          ? null
          : listingIds[step % listingIds.length],
      occurred_at: iso(at),
    };
  });
}

const timeline = customers.flatMap((customer, index) =>
  buildTimeline(customer, index),
);

/* ==========================================================================
   7. sales — 12 aylık kapanan işlem serisi
   ==========================================================================
   Bu seri ilan verisinden TÜRETİLMEZ: 46 kayıtlık bir portföy anlamlı bir
   zaman serisi vermez (yalnızca 6'sı "satildi"). Bağımsız bir olgu olarak
   üretilip `sales` tablosuna tek tek satır olarak yazılır; dashboard grafiği
   bunları aya göre gruplayarak okur.
   ========================================================================== */

type SaleRow = {
  listing_id: string | null;
  customer_id: string | null;
  agent_id: string;
  amount: number;
  commission_status: "pending" | "collected" | "overdue";
  closed_at: string;
};

/** Konut piyasasının mevsimsel ritmi: ilkbaharda zirve, kışın dip.
 *  Dizin = takvim ayı (0 = Ocak). */
const SEASONALITY = [
  0.72, 0.79, 0.96, 1.14, 1.24, 1.17,
  1.02, 0.88, 1.05, 1.12, 0.94, 0.81,
] as const;

function buildSales(): SaleRow[] {
  const reference = new Date(NOW);
  const endYear = reference.getUTCFullYear();
  const endMonth = reference.getUTCMonth();
  const random = mulberry32(hashSeed(0x5a1e5));
  const rows: SaleRow[] = [];

  for (let index = 0; index < 12; index += 1) {
    const monthsAgo = 11 - index;
    const monthStart = Date.UTC(endYear, endMonth - monthsAgo, 1);
    const monthEnd = Date.UTC(endYear, endMonth - monthsAgo + 1, 1);
    const calendarMonth = new Date(monthStart).getUTCMonth();

    /* Yıl boyunca %28'lik hafif bir büyüme + dar bant gürültü. */
    const growth = 1 + (index / 11) * 0.28;
    const noise = between(random, 0.9, 1.1);
    const count = Math.max(
      3,
      Math.round(9 * SEASONALITY[calendarMonth] * growth * noise),
    );

    /* Ortalama işlem tutarı da dalgalanır ama dar bir bantta: bandı geniş
       tutunca ciro eğrisi mevsimselliği değil gürültüyü gösteriyor. */
    const averageTicket = roundTo(between(random, 5_200_000, 6_400_000), 50_000);

    /* İçinde bulunulan ay yarım: işlemler bugüne kadar dağıtılır. */
    const windowEnd = Math.min(monthEnd, NOW);

    for (let i = 0; i < count; i += 1) {
      const listing = pick(random, sellable);
      const customer = pick(random, customers);
      const closedAt = Math.floor(
        between(random, monthStart, Math.max(windowEnd - 1, monthStart + 1)),
      );

      /* TAHSİLAT DURUMU YAŞA GÖRE. Eski satışların komisyonu çoğunlukla
         tahsil edilmiş, yenilerinki bekliyor; birkaçı gecikmiş. Hepsini
         "bekliyor" bırakmak Gelirler sayfasında tek renkli bir grafik
         üretirdi ve tahsilat oranı hep %0 görünürdü. */
      const ageDays = (NOW - closedAt) / DAY;
      const commissionStatus =
        ageDays > 120
          ? weighted<SaleRow["commission_status"]>(random, [
              ["collected", 88],
              ["overdue", 12],
            ])
          : ageDays > 45
            ? weighted<SaleRow["commission_status"]>(random, [
                ["collected", 55],
                ["pending", 30],
                ["overdue", 15],
              ])
            : weighted<SaleRow["commission_status"]>(random, [
                ["pending", 78],
                ["collected", 22],
              ]);

      rows.push({
        listing_id: listing.id,
        customer_id: customer.id,
        agent_id: pick(random, agents).id,
        amount: averageTicket,
        commission_status: commissionStatus,
        closed_at: iso(closedAt),
      });
    }
  }

  return rows;
}

const sales = buildSales();

/* ==========================================================================
   8. offers — bekleyen teklifler
   ==========================================================================
   "Bekleyen Teklif" KPI'ı Faz 3-4'te sabit 14'tü. Artık gerçek satır sayısı:
   son 6 ayın teklifleri üretilir, en yeni 14'ü `pending` bırakılır, geri
   kalanı sonuçlanmış sayılır.
   ========================================================================== */

type OfferRow = {
  listing_id: string;
  customer_id: string;
  agent_id: string;
  amount: number;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
};

const PENDING_OFFER_COUNT = 14;

function buildOffers(): OfferRow[] {
  const random = mulberry32(hashSeed(0x0ffe5));
  const rows: OfferRow[] = [];

  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo -= 1) {
    const count = intBetween(random, 8, 19);
    for (let i = 0; i < count; i += 1) {
      const listing = pick(random, sellable);
      const customer = pick(random, customers);
      const daysAgo = monthsAgo * 30 + between(random, 0, 30);
      const at = NOW - daysAgo * DAY;

      rows.push({
        listing_id: listing.id,
        customer_id: customer.id,
        agent_id: pick(random, agents).id,
        amount: roundTo(listing.price * between(random, 0.86, 0.97), 50_000),
        status: "expired", // aşağıda yeniden atanıyor
        created_at: iso(at),
      });
    }
  }

  rows.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  rows.forEach((row, index) => {
    row.status =
      index < PENDING_OFFER_COUNT
        ? "pending"
        : weighted(random, [
            ["accepted", 30] as const,
            ["rejected", 45] as const,
            ["expired", 25] as const,
          ]);
  });

  return rows;
}

const offers = buildOffers();

/* ==========================================================================
   9. activity_log
   ========================================================================== */

type ActivityType =
  | "listing_created" | "sale_closed" | "offer_received"
  | "customer_added" | "appointment_scheduled";

type ActivityRow = {
  event_type: ActivityType;
  description: string;
  amount: number | null;
  actor_agent_id: string;
  related_listing_id: string | null;
  related_customer_id: string | null;
  created_at: string;
};

/** Olaylar arası dakika farkları — üstteki "az önce", alttaki "dün" olsun. */
const ACTIVITY_GAPS_MIN = [3, 21, 47, 95, 168, 260, 415, 640, 1_180, 1_610] as const;

const ACTIVITY_TYPES: ActivityType[] = [
  "sale_closed", "offer_received", "listing_created", "customer_added",
  "appointment_scheduled", "listing_created", "offer_received",
  "customer_added", "sale_closed", "appointment_scheduled",
];

function buildActivity(): ActivityRow[] {
  const random = mulberry32(hashSeed(0xac71));

  return ACTIVITY_TYPES.map((type, index) => {
    const elapsed = ACTIVITY_GAPS_MIN[index] ?? (index + 1) * 240;

    /* Satış ve teklif olaylarında kiralık ilan seçilemez — aylık kira bedeli
       satış tutarı gibi görünür ("₺60.500 satışı tamamlandı"). */
    const isMoneyEvent = type === "sale_closed" || type === "offer_received";
    const pool = isMoneyEvent ? sellable : listings;

    const listing = pool[intBetween(random, 0, pool.length - 1)];
    const agent = agents[intBetween(random, 0, agents.length - 1)];
    const customer = customers[intBetween(random, 0, customers.length - 1)];

    const isCustomerEvent =
      type === "customer_added" || type === "appointment_scheduled";

    return {
      event_type: type,
      /* Kısa özne; cümlenin fiilini arayüz kurar. */
      description: isCustomerEvent ? customer.full_name : listing.title,
      amount:
        type === "sale_closed"
          ? listing.price
          : type === "offer_received"
            ? roundTo(listing.price * between(random, 0.86, 0.97), 50_000)
            : null,
      actor_agent_id: agent.id,
      /* Yeni müşteri kaydında ilan yok; randevu bir ilanı gezmek için alınır. */
      related_listing_id: type === "customer_added" ? null : listing.id,
      related_customer_id: isCustomerEvent ? customer.id : null,
      created_at: iso(NOW - elapsed * 60_000),
    };
  });
}

const activity = buildActivity();

/* ==========================================================================
   9b. Faz 11–14 tabloları
   ==========================================================================
   Faz 15'e kadar seed yalnızca Faz 5'te var olan sekiz tabloyu dolduruyordu.
   Sonraki fazlarda gelen altı tablo (randevular, konuşmalar, mesajlar,
   evraklar, bildirimler, şirket ayarları) boş kalıyordu — yani demo'yu
   izleyen biri dört sayfayı bomboş görüyordu. Bu bölüm o boşluğu kapatıyor.
   ========================================================================== */

/* --- 9b.1 appointments --------------------------------------------------- */

type AppointmentRow = {
  title: string;
  appointment_type:
    | "ev_gezme"
    | "telefon_gorusmesi"
    | "ofis_gorusmesi"
    | "sozlesme_imzalama"
    | "diger";
  customer_id: string;
  listing_id: string | null;
  agent_id: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  status: "planlandi" | "tamamlandi" | "iptal";
};

const APPOINTMENT_TITLES: Record<string, string[]> = {
  ev_gezme: ["Daire gezme", "İkinci ziyaret", "Yerinde inceleme"],
  telefon_gorusmesi: ["Ön görüşme", "Bilgilendirme araması", "Geri dönüş"],
  ofis_gorusmesi: ["Ofis görüşmesi", "Portföy sunumu", "Bütçe görüşmesi"],
  sozlesme_imzalama: ["Sözleşme imzası", "Tapu randevusu"],
  diger: ["Ekspertiz", "Kredi görüşmesi"],
};

/**
 * Randevular takvime YAYILIYOR: geçmiş üç hafta ve gelecek üç hafta.
 *
 * Tek bir güne yığılsaydı hafta ve ay görünümleri boş kalırdı; demo'da
 * takvimin üç görünümü de dolu görünmeli. Geçmiştekiler ağırlıkla
 * "tamamlandı", gelecektekiler "planlandı" — tersi tuhaf olurdu.
 *
 * ÇALIŞMA SAATİ 09:00–18:00 ve slot 30 dakikanın katı: ızgara böyle çiziliyor,
 * 09:17'de başlayan bir randevu demoda dikkat dağıtırdı.
 */
function buildAppointments(): AppointmentRow[] {
  const rows: AppointmentRow[] = [];
  const customersWithInterest = customers.filter((customer) =>
    interestsByCustomer.has(customer.id),
  );

  for (let index = 0; index < 46; index += 1) {
    const random = mulberry32(hashSeed(index + 120_000));
    const customer =
      customersWithInterest[index % customersWithInterest.length];
    const listingIds = interestsByCustomer.get(customer.id) ?? [];

    const type = weighted<AppointmentRow["appointment_type"]>(random, [
      ["ev_gezme", 40],
      ["telefon_gorusmesi", 22],
      ["ofis_gorusmesi", 20],
      ["sozlesme_imzalama", 10],
      ["diger", 8],
    ]);

    /* -21 … +21 gün. Bugün çevresinde yoğunlaşsın diye iki uçtan da
       eşit çekiyoruz. */
    const dayOffset = intBetween(random, -21, 21);
    const startHour = intBetween(random, 9, 17);
    const startMinute = pick(random, [0, 30]);
    const durationMinutes = pick(random, [30, 60, 60, 90]);

    const base = new Date(NOW + dayOffset * DAY);
    base.setUTCHours(startHour - 3, startMinute, 0, 0); // UTC+3 ofis saati
    const start = base.getTime();

    /* Hafta sonuna düşenleri pazartesiye kaydırıyoruz — emlak ofisi hafta
       sonu da çalışır ama demo'da iş günü yoğunluğu daha gerçekçi. */
    const weekday = new Date(start).getUTCDay();
    const shift = weekday === 6 ? 2 * DAY : weekday === 0 ? DAY : 0;

    const startTime = start + shift;
    const endTime = startTime + durationMinutes * 60_000;

    /* Geçmiş randevu tamamlanmış ya da iptal; gelecek olan planlı. */
    const isPast = startTime < NOW;
    const status: AppointmentRow["status"] = isPast
      ? weighted(random, [
          ["tamamlandi", 78],
          ["iptal", 22],
        ])
      : "planlandi";

    const listingId =
      type === "ev_gezme" || type === "sozlesme_imzalama"
        ? (listingIds[index % listingIds.length] ?? null)
        : listingIds.length > 0 && random() < 0.4
          ? listingIds[0]
          : null;

    rows.push({
      title: pick(random, APPOINTMENT_TITLES[type]),
      appointment_type: type,
      customer_id: customer.id,
      listing_id: listingId,
      agent_id: customer.assigned_agent_id,
      start_time: iso(startTime),
      end_time: iso(endTime),
      location:
        type === "ofis_gorusmesi"
          ? "Ofis — Bağdat Cad. No:184"
          : type === "telefon_gorusmesi"
            ? ""
            : pick(random, [
                "Kadıköy, Moda",
                "Beşiktaş, Etiler",
                "Şişli, Nişantaşı",
                "Ataşehir, Batı",
              ]),
      notes: pick(random, [
        "",
        "Müşteri otoparkı önemsiyor.",
        "Eşiyle birlikte gelecek.",
        "Kredi ön onayı hazır.",
        "Görüşme öncesi fiyat listesi hazırlanacak.",
      ]),
      status,
    });
  }

  return rows;
}

const appointments = buildAppointments();

/* --- 9b.2 work_notes ----------------------------------------------------- */

type WorkNoteRow = {
  id: string;
  customer_id: string | null;
  listing_id: string | null;
  author_agent_id: string;
  note_type: "question" | "assignment" | "note";
  content: string;
  mentioned_agent_id: string | null;
  status: "open" | "resolved" | null;
  resolved_by_agent_id: string | null;
  resolved_at: string | null;
  parent_note_id: string | null;
  created_at: string;
};

/* Faz 18: müşteriyle yazışma yerine EKİP İÇİ iş notları. Metinler bir emlak
   ofisinde gerçekten yazılacak şeyler — "Merhaba, ilanı gördüm" gibi
   satırlar müşteriden gelirdi ve bu sistemde müşteri yok. */

const QUESTION_LINES = [
  "Evrakları ne zaman teslim alabiliriz? Tapu randevusu için tarih vermem gerekiyor.",
  "Bu müşteriye kredi ön onayı çıktı mı, bilen var mı?",
  "Mal sahibi fiyatta ne kadar iniyor? Teklif hazırlayacağım.",
  "Anahtar kimde? Yarın 11:00 için yer gösterme sözü verdim.",
  "Aidat bilgisini teyit edebilir miyiz, ilanda 2.500 yazıyor ama emin değilim.",
  "İskân belgesi dosyada var mı? Alıcı sordu.",
  "Bu kayıt için sözleşme taslağı hazırlandı mı?",
];

const ASSIGNMENT_LINES = [
  "Bu kaydı ben üstleniyorum, süreç bende devam edecek.",
  "İzne çıkıyorum, dönene kadar sende kalsın.",
  "Müşteriyle ilk görüşmeyi ben yaptım, portföyüme alıyorum.",
  "Bölge sende olduğu için devrediyorum.",
];

const NOTE_LINES = [
  "Fiyat konusunda esnek değil, pazarlık payı yok gibi.",
  "Sabah saatlerinde aranmak istemiyor, öğleden sonra uygun.",
  "Nakit alıcı, kredi süreci beklemiyoruz.",
  "Eşiyle birlikte karar veriyor; ikisi birden gelmeden teklif çıkmaz.",
  "Site içindeki manzaralı blokları tercih ediyor.",
  "Taşınma tarihi Eylül'den önce olamaz, kira sözleşmesi devam ediyor.",
];

const REPLY_LINES = [
  "Ben ilgileniyorum, yarın öğlene kadar dönerim.",
  "Mal sahibiyle konuştum, 200.000 TL indirim var.",
  "Evraklar bugün elime geçti, dosyaya yükledim.",
  "Anahtar ofiste, resepsiyonda bırakıyorum.",
  "Teyit ettim, aidat 2.500 TL ve ısıtma dahil.",
];

/**
 * İş notları — üç tür, ikisi takip edilebilir.
 *
 * DAĞILIM BİLİNÇLİ, tek tip veriyle arayüzün yarısı hiç çizilmez:
 *
 *  · Bir kısmı AÇIK kalıyor → panodaki "Açık sorular" sekmesi ve müşteri
 *    detayındaki "N açık" rozeti dolu görünsün.
 *  · Bir kısmı @mention taşıyor → "Bana yönelik" sekmesi ve sidebar rozeti
 *    çalışsın. Anılan kişi kaydın sahibi DEĞİL, başka bir danışman: notu
 *    yazan da anılan da aynı kişi olsaydı bildirim hiç doğmazdı.
 *  · Bir kısmının yanıtı var → yanıt zinciri ve `parent_note_id` görünsün.
 *  · Genel notların durumu NULL → şema kısıtı (`work_notes_status_matches_type`)
 *    seed tarafından da doğrulanmış oluyor.
 *
 * Notların çoğu MÜŞTERİYE bağlı, bir kısmı İLANA: iki bağlam da denenmiş
 * olsun. Hiçbiri bağlamsız değil — şema zaten reddederdi.
 */
function buildWorkNotes(): WorkNoteRow[] {
  const notes: WorkNoteRow[] = [];
  let counter = 0;

  const nextId = () =>
    `c0000000-0000-4000-8000-${String((counter += 1)).padStart(12, "0")}`;

  /* Bir danışmanın kendisi dışındaki ilk meslektaşı — @mention hedefi.
     Seed'deki personelin hepsi aktif (`is_active` kolonu varsayılanı `true`),
     o yüzden ek bir süzme gerekmiyor. */
  const otherAgent = (agentId: string) =>
    agents.find((agent) => agent.id !== agentId)?.id ?? null;

  /* --- Müşteriye bağlı notlar --- */
  const eligible = customers.filter(
    (customer, index) =>
      customer.status === "sicak" ||
      (customer.status === "normal" && index % 3 === 0),
  );

  eligible.forEach((customer, index) => {
    const random = mulberry32(hashSeed(index + 200_000));
    const author = customer.assigned_agent_id;
    const at = NOW - intBetween(random, 1, 25) * DAY;

    /* Tür dağılımı: yarısı soru, üçte biri genel not, kalanı atama. Soru
       çoğunlukta çünkü panonun varsayılan sekmesi onları gösteriyor. */
    const roll = random();
    const type: WorkNoteRow["note_type"] =
      roll < 0.5 ? "question" : roll < 0.85 ? "note" : "assignment";

    /* Soruların yarısı belirli birine yöneltiliyor, yarısı tüm ekibe. */
    const mentioned =
      type !== "note" && random() < 0.55 ? otherAgent(author) : null;

    /* Açık/çözülmüş: genel notta durum YOK (şema kısıtı), diğerlerinin
       yaklaşık üçte biri kapatılmış. */
    const resolved = type !== "note" && random() < 0.35;
    const resolvedAt = resolved ? at + intBetween(random, 2, 40) * 3_600_000 : null;

    const id = nextId();

    notes.push({
      id,
      customer_id: customer.id,
      listing_id: null,
      author_agent_id: author,
      note_type: type,
      content:
        type === "question"
          ? pick(random, QUESTION_LINES)
          : type === "assignment"
            ? pick(random, ASSIGNMENT_LINES)
            : pick(random, NOTE_LINES),
      mentioned_agent_id: mentioned,
      status: type === "note" ? null : resolved ? "resolved" : "open",
      resolved_by_agent_id: resolved ? (mentioned ?? author) : null,
      resolved_at: resolvedAt ? iso(resolvedAt) : null,
      parent_note_id: null,
      created_at: iso(at),
    });

    /* Soruların bir kısmına yanıt: yanıt her zaman genel not ve üst notun
       bağlamını devralıyor (uygulama da öyle yazıyor). */
    if (type === "question" && random() < 0.45) {
      notes.push({
        id: nextId(),
        customer_id: customer.id,
        listing_id: null,
        author_agent_id: mentioned ?? otherAgent(author) ?? author,
        note_type: "note",
        content: pick(random, REPLY_LINES),
        mentioned_agent_id: null,
        status: null,
        resolved_by_agent_id: null,
        resolved_at: null,
        parent_note_id: id,
        created_at: iso(at + intBetween(random, 1, 20) * 3_600_000),
      });
    }
  });

  /* --- İlana bağlı notlar --- */
  listings
    .filter((listing) => listing.status === "aktif")
    .slice(0, 10)
    .forEach((listing, index) => {
      const random = mulberry32(hashSeed(index + 210_000));
      const author = listing.agent_id;
      const at = NOW - intBetween(random, 1, 18) * DAY;
      const isQuestion = random() < 0.6;

      notes.push({
        id: nextId(),
        customer_id: null,
        listing_id: listing.id,
        author_agent_id: author,
        note_type: isQuestion ? "question" : "note",
        content: isQuestion
          ? pick(random, QUESTION_LINES)
          : pick(random, NOTE_LINES),
        mentioned_agent_id: isQuestion ? otherAgent(author) : null,
        status: isQuestion ? "open" : null,
        resolved_by_agent_id: null,
        resolved_at: null,
        parent_note_id: null,
        created_at: iso(at),
      });
    });

  /* Üst notlar önce yazılmalı: `parent_note_id` kendine referans veren bir
     yabancı anahtar ve toplu insert sırayı korumuyor olabilir. Yanıtları
     sona almak, üst notun her hâlükârda mevcut olmasını garantiliyor. */
  return [...notes].sort((a, b) => {
    if (!a.parent_note_id && b.parent_note_id) return -1;
    if (a.parent_note_id && !b.parent_note_id) return 1;
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  });
}

const workNotes = buildWorkNotes();

/* --- 9b.3 notifications -------------------------------------------------- */

type NotificationRow = {
  agent_id: string;
  type:
    | "customer_added"
    | "listing_created"
    | "sale_closed"
    | "appointment_scheduled"
    | "work_note_mention"
    | "work_note_assigned"
    | "work_note_resolved";
  title: string;
  description: string;
  related_entity_type:
    | "customer"
    | "listing"
    | "sale"
    | "appointment"
    | "work_note"
    | null;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * Bildirimler GERÇEK KAYITLARA bağlanıyor.
 *
 * Uydurma kimliklerle doldurulsaydı her satır tıklandığında 404 verirdi;
 * `notificationHref()` bağı çözemediğinde satırı tıklanamaz çiziyor ama
 * demo'da bağlantıların çalışması gerekiyor.
 *
 * Bir kısmı okunmamış: zil rozeti demo'da görünsün.
 */
function buildNotifications(): NotificationRow[] {
  const rows: NotificationRow[] = [];

  /* Satışlar → ilanın danışmanına "satış kapandı". */
  sales.slice(0, 6).forEach((sale, index) => {
    const random = mulberry32(hashSeed(index + 300_000));
    const listing = listings.find((item) => item.id === sale.listing_id);
    if (!listing) return;

    const at = Date.parse(sale.closed_at);
    rows.push({
      agent_id: listing.agent_id,
      type: "sale_closed",
      title: "İlanınız satıldı",
      description: `${listing.title} · ₺${sale.amount.toLocaleString("tr-TR")}`,
      related_entity_type: "sale",
      related_entity_id: listing.id,
      read_at: random() < 0.6 ? iso(at + 2 * 3_600_000) : null,
      created_at: iso(at),
    });
  });

  /* Yeni müşteri atamaları. */
  customers.slice(0, 8).forEach((customer, index) => {
    const random = mulberry32(hashSeed(index + 310_000));
    const at = NOW - intBetween(random, 1, 20) * DAY;
    rows.push({
      agent_id: customer.assigned_agent_id,
      type: "customer_added",
      title: "Size yeni bir müşteri atandı",
      description: customer.full_name,
      related_entity_type: "customer",
      related_entity_id: customer.id,
      read_at: random() < 0.5 ? iso(at + 3_600_000) : null,
      created_at: iso(at),
    });
  });

  /* Birine YÖNELTİLMİŞ açık notlar → "sana soruldu" / "kayıt devri".
     Uygulamada bu satırları `createWorkNote` yazıyor; burada aynı kural elle
     tekrarlanıyor ki demo'da zil ve sidebar rozeti dolu görünsün.

     BİLDİRİM ANILAN KİŞİYE gidiyor, notu yazana değil — `notify()` de zaten
     kendine bildirim yazmıyor. */
  workNotes
    .filter(
      (note) => note.status === "open" && note.mentioned_agent_id !== null,
    )
    /* ATAMALAR ÖNCE. Liste tarih sırasında ve atamalar azınlıkta (soru
       çoğunlukta bilerek); `slice` doğrudan uygulansaydı ilk sekiz satır
       tesadüfen hep soru olabiliyordu ve demo'da `work_note_assigned`
       bildirimi hiç görünmüyordu — bir tür sessizce kayboluyordu. */
    .sort((a, b) => {
      if (a.note_type === b.note_type) return 0;
      return a.note_type === "assignment" ? -1 : 1;
    })
    .slice(0, 8)
    .forEach((note, index) => {
      const random = mulberry32(hashSeed(index + 315_000));
      const context = note.customer_id
        ? customers.find((item) => item.id === note.customer_id)?.full_name
        : listings.find((item) => item.id === note.listing_id)?.title;

      const isAssignment = note.note_type === "assignment";

      rows.push({
        agent_id: note.mentioned_agent_id!,
        type: isAssignment ? "work_note_assigned" : "work_note_mention",
        title: isAssignment
          ? `${context ?? "Bir kayıt"} sana devredildi`
          : `${context ?? "Bir kayıt"} için sana soruldu`,
        description: note.content.slice(0, 120),
        related_entity_type: "work_note",
        related_entity_id: note.id,
        /* Çoğu okunmamış: rozet demo'da görünsün. */
        read_at: random() < 0.25 ? iso(Date.parse(note.created_at) + 3_600_000) : null,
        created_at: note.created_at,
      });
    });

  /* Kapatılmış notlar → soruyu sorana "çözüldü". */
  workNotes
    .filter((note) => note.status === "resolved" && note.resolved_at)
    .slice(0, 4)
    .forEach((note) => {
      rows.push({
        agent_id: note.author_agent_id,
        type: "work_note_resolved",
        title:
          note.note_type === "assignment"
            ? "Yaptığın devir kabul edildi"
            : "Sorduğun soru çözüldü",
        description: note.content.slice(0, 120),
        related_entity_type: "work_note",
        related_entity_id: note.id,
        read_at: note.resolved_at,
        created_at: note.resolved_at!,
      });
    });

  /* Yaklaşan randevular. */
  appointments
    .filter((appointment) => appointment.status === "planlandi")
    .slice(0, 5)
    .forEach((appointment, index) => {
      const random = mulberry32(hashSeed(index + 320_000));
      rows.push({
        agent_id: appointment.agent_id,
        type: "appointment_scheduled",
        title: "Takviminize randevu eklendi",
        description: appointment.title,
        related_entity_type: "appointment",
        related_entity_id: null,
        read_at: random() < 0.4 ? iso(NOW - DAY) : null,
        created_at: iso(Date.parse(appointment.start_time) - 3 * DAY),
      });
    });

  return rows.sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}

const notifications = buildNotifications();

/* --- 9b.4 documents ------------------------------------------------------ */

type DocumentRow = {
  title: string;
  document_type: "pdf" | "tapu" | "kimlik" | "sozlesme";
  related_customer_id: string | null;
  related_listing_id: string | null;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
};

/**
 * Geçerli, en küçük PDF.
 *
 * NEDEN GERÇEK DOSYA YÜKLENİYOR: `documents.file_url` private bucket'taki
 * nesne yolunu taşıyor ve indirme anında imzalanıyor. Var olmayan bir yola
 * işaret eden satırlar listeyi dolu gösterir ama her indirme denemesi
 * hataya düşerdi — demo'da en çok göze batacak şey de bu olurdu.
 *
 * Bu yüzden seed bucket'a gerçekten yazıyor. Dosya 300 bayttan küçük ve
 * açıldığında tek satırlık bir metin gösteriyor.
 */
function minimalPdf(label: string): Uint8Array {
  const text = label.replace(/[()\\]/g, "");
  const body = `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 70>>stream
BT /F1 12 Tf 20 60 Td (${text}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>`;
  return new TextEncoder().encode(`%PDF-1.4\n${body}\n%%EOF\n`);
}

function buildDocuments(): DocumentRow[] {
  const rows: DocumentRow[] = [];

  const plan: {
    type: DocumentRow["document_type"];
    label: string;
    count: number;
  }[] = [
    { type: "tapu", label: "Tapu fotokopisi", count: 6 },
    { type: "sozlesme", label: "Satış sözleşmesi", count: 5 },
    { type: "kimlik", label: "Kimlik fotokopisi", count: 4 },
    { type: "pdf", label: "Ekspertiz raporu", count: 4 },
  ];

  let counter = 0;

  for (const entry of plan) {
    for (let index = 0; index < entry.count; index += 1) {
      const random = mulberry32(hashSeed(counter + 400_000));
      const customer = customers[(counter * 5) % customers.length];
      const listingIds = interestsByCustomer.get(customer.id) ?? [];
      const listingId = listingIds[0] ?? null;

      rows.push({
        title:
          entry.type === "kimlik"
            ? `${entry.label} — ${customer.full_name}`
            : `${entry.label} — ${listingId ? listingId.toUpperCase() : customer.full_name}`,
        document_type: entry.type,
        related_customer_id: customer.id,
        /* Kimlik belgesi ilana bağlanmıyor: kişiye ait bir belge. */
        related_listing_id: entry.type === "kimlik" ? null : listingId,
        file_url: `seed-${String(counter + 1).padStart(3, "0")}.pdf`,
        file_size: 0, // gerçek boyut yüklemeden sonra yazılıyor
        mime_type: "application/pdf",
        uploaded_by: customer.assigned_agent_id,
        created_at: iso(NOW - intBetween(random, 1, 60) * DAY),
      });

      counter += 1;
    }
  }

  return rows;
}

const documents = buildDocuments();

/* --- 9b.5 company_settings ----------------------------------------------- */

const companySettings = {
  id: "default",
  name: "EstateFlow Gayrimenkul",
  logo_url: null,
  address: "Bağdat Caddesi No:184, Kadıköy / İstanbul",
  tax_office: "Kadıköy",
  tax_number: "1234567890",
  phone: "+90 216 555 12 34",
  email: "info@estateflow.com",
};

/* ==========================================================================
   10. Yazma
   ========================================================================== */

/** PostgREST tek istekte binlerce satır alabilir ama parçalamak hata
 *  mesajlarını okunur tutuyor. */
const CHUNK = 250;

async function insertAll(table: string, rows: object[]) {
  for (let index = 0; index < rows.length; index += CHUNK) {
    const slice = rows.slice(index, index + CHUNK);
    const { error } = await supabase.from(table).insert(slice);
    if (error) {
      throw new Error(`${table} yazılamadı: ${error.message}`);
    }
  }
  console.log(`  ✓ ${table.padEnd(28)} ${rows.length} kayıt`);
}

/** Silme sırası yabancı anahtarları takip eder: çocuklar önce. */
const DELETE_ORDER = [
  /* Faz 11–18 tabloları en başta: hepsi listings/customers/agents'a bağlı.
     `work_notes` kendine de referans veriyor (`parent_note_id`) ama tek bir
     filtresiz DELETE hepsini birden siliyor, sıra sorunu doğmuyor. */
  "notifications",
  "work_notes",
  "documents",
  "appointments",
  "offers",
  "sales",
  "activity_log",
  "customer_timeline_events",
  "customer_listing_interests",
  "listings",
  "customers",
  "agents",
];

/**
 * Demo belgelerini private bucket'a yükler ve gerçek boyutu satırlara yazar.
 *
 * Satırlar yazılmadan ÖNCE çalışmalı: `file_size` kolonunu buradan dönen
 * gerçek bayt sayısı dolduruyor. Yükleme başarısız olursa seed durmuyor —
 * belge listesi yine dolu görünür, yalnızca indirme çalışmaz; bu, tüm
 * seed'in çökmesinden iyi.
 */
async function uploadDemoDocuments() {
  let uploaded = 0;

  for (const document of documents) {
    const bytes = minimalPdf(document.title);
    document.file_size = bytes.byteLength;

    const { error } = await supabase.storage
      .from("documents")
      .upload(document.file_url, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.warn(`  ! ${document.file_url} yüklenemedi: ${error.message}`);
      continue;
    }
    uploaded += 1;
  }

  console.log(`  ✓ ${"documents (dosya)".padEnd(28)} ${uploaded} dosya`);
}

async function main() {
  console.log(`\n  Supabase seed → ${url}`);
  console.log(`  Tarih çapası: ${new Date(NOW).toISOString()}\n`);

  console.log("  Mevcut kayıtlar siliniyor…");
  for (const table of DELETE_ORDER) {
    /* PostgREST filtresiz DELETE'i reddeder; her satırı kapsayan bir koşul
       veriyoruz. `not.is.null` birincil anahtarda daima doğrudur. */
    const { error } = await supabase
      .from(table)
      .delete()
      .not("created_at", "is", null);
    if (error) {
      throw new Error(`${table} temizlenemedi: ${error.message}`);
    }
  }

  console.log("  Yazılıyor…");
  /* Personel satırları yazılmadan ÖNCE: eşleştirme `agents` dizisini yerinde
     güncelliyor. */
  await linkTestUser();
  await insertAll("agents", agents);
  await insertAll("listings", listings);
  await insertAll("customers", customers);
  await insertAll("customer_listing_interests", interests);
  await insertAll("customer_timeline_events", timeline);
  await insertAll("sales", sales);
  await insertAll("offers", offers);
  await insertAll("activity_log", activity);

  /* --- Faz 11–14 tabloları --- */
  await insertAll("appointments", appointments);
  await insertAll("work_notes", workNotes);

  /* Dosyalar satırlardan önce: `file_size` yüklemeden dönüyor. */
  await uploadDemoDocuments();
  await insertAll("documents", documents);

  await insertAll("notifications", notifications);

  /* Şirket ayarları TEK SATIR ve migration'da açıldı; siliniyor değil,
     üzerine yazılıyor. */
  const { error: companyError } = await supabase
    .from("company_settings")
    .upsert(companySettings);
  if (companyError) {
    throw new Error(`company_settings yazılamadı: ${companyError.message}`);
  }
  console.log(`  ✓ ${"company_settings".padEnd(28)} 1 kayıt`);

  const pending = offers.filter((offer) => offer.status === "pending").length;
  const revenue = sales
    .filter((sale) => Date.parse(sale.closed_at) >= Date.UTC(
      new Date(NOW).getUTCFullYear(),
      new Date(NOW).getUTCMonth(),
      1,
    ))
    .reduce((sum, sale) => sum + sale.amount, 0);

  console.log(
    [
      "",
      "  Özet",
      `    İlan            ${listings.length}`,
      `    Müşteri         ${customers.length}`,
      `    İlgi kaydı      ${interests.length} (${interests.filter((row) => row.intent === "rent").length} kiralama)`,
      `    Timeline olayı  ${timeline.length}`,
      `    Kapanan satış   ${sales.length} (${sales.filter((row) => row.commission_status === "collected").length} komisyon tahsil edildi)`,
      `    Teklif          ${offers.length} (${pending} bekliyor)`,
      `    Randevu         ${appointments.length} (${appointments.filter((row) => row.status === "planlandi").length} planlı)`,
      `    İş notu         ${workNotes.length} (${workNotes.filter((row) => row.status === "open").length} açık · ${workNotes.filter((row) => row.parent_note_id !== null).length} yanıt)`,
      `    Evrak           ${documents.length}`,
      `    Bildirim        ${notifications.length} (${notifications.filter((row) => row.read_at === null).length} okunmamış)`,
      `    Bu ay ciro      ₺${revenue.toLocaleString("tr-TR")}`,
      "",
      "  Tamamlandı.",
      "",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(`\n  ✖ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
