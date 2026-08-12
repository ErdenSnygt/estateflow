import {
  Bell,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Receipt,
  Settings,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  /** Route path — aynı zamanda listede benzersiz anahtar. */
  href: string;
  /**
   * Çeviri anahtarı — Faz 19.
   *
   * Etiket ve açıklama ARTIK BURADA DEĞİL, `messages/<dil>.json` içindeki
   * `nav.<key>.label` / `nav.<key>.description` altında. Bu dosya yalnızca
   * YAPIYI taşıyor: hangi öğe, hangi adres, hangi ikon, hangi grup.
   *
   * Ayrım bilinçli: menü yapısı bir yapılandırma, etiketler ise içerik. İkisi
   * birlikte dururken bir dil eklemek bu dosyayı çoğaltmayı gerektirirdi.
   *
   * `href` ADRESLERİ ÇEVRİLMİYOR: `/ilanlar` İngilizce arayüzde de `/ilanlar`.
   * Gerekçe `src/i18n/config.ts` başlığında.
   */
  key: NavKey;
  icon: LucideIcon;
  /**
   * Rozetin hangi CANLI sayaçtan besleneceği.
   *
   * Faz 1'den Faz 16'ya kadar burada sabit sayılar duruyordu (`badge: 4`,
   * `badge: 9`) ve hiçbir veriye bağlı değildi: mesaj okunduğunda ya da
   * bildirim temizlendiğinde sayı olduğu yerde kalıyordu. Artık yalnızca
   * HANGİ sayaç olduğu yazılı; değeri sunucu veriyor
   * (`components/layout/nav-badge-provider.tsx`).
   */
  badgeKey?: NavBadgeKey;
};

/** Canlı rozet kaynakları. */
export type NavBadgeKey = "messages" | "notifications";

/** `messages/*.json` → `nav.<key>` altındaki anahtarlar. */
export type NavKey =
  | "dashboard"
  | "listings"
  | "customers"
  | "appointments"
  | "messages"
  | "documents"
  | "sales"
  | "revenue"
  | "agents"
  | "reports"
  | "notifications"
  | "settings";

/** `messages/*.json` → `nav.groups.<key>` altındaki anahtarlar. */
export type NavGroupKey =
  | "general"
  | "portfolio"
  | "communication"
  | "finance"
  | "management"
  | "system";

export type NavGroup = {
  /**
   * Grubun çeviri anahtarı (`nav.groups.<key>`).
   *
   * Faz 19'a kadar burada `title` ve `paletteTitle` diye İKİ metin vardı:
   * sidebar başlıksız grupları çizmiyor, komut paleti ise her gruba başlık
   * istiyordu. Artık tek anahtar var ve o ayrım `showTitle` ile yapılıyor —
   * çeviri dosyasında aynı metni iki kez tutmak gerekmiyor.
   */
  key: NavGroupKey;
  /** Sidebar grubun başlığını çizsin mi? Komut paleti her zaman çiziyor. */
  showTitle: boolean;
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    key: "general",
    showTitle: false,
    items: [{ href: "/dashboard", key: "dashboard", icon: LayoutDashboard }],
  },
  {
    key: "portfolio",
    showTitle: true,
    items: [
      { href: "/ilanlar", key: "listings", icon: Building2 },
      { href: "/musteriler", key: "customers", icon: Users },
      { href: "/randevular", key: "appointments", icon: CalendarDays },
    ],
  },
  {
    key: "communication",
    showTitle: true,
    items: [
      /* Faz 18: içerik müşteri yazışmasından EKİP İÇİ İŞ NOTUNA döndü.
         Adres ve menü sırası bilinçli olarak korundu — kullanıcının menüde
         aradığı yer burası ve kaydedilmiş bağlantılar kırılmasın. */
      { href: "/mesajlar", key: "messages", icon: MessageSquare, badgeKey: "messages" },
      { href: "/evraklar", key: "documents", icon: FileText },
    ],
  },
  {
    key: "finance",
    showTitle: true,
    items: [
      { href: "/satislar", key: "sales", icon: Receipt },
      { href: "/gelirler", key: "revenue", icon: Wallet },
    ],
  },
  {
    key: "management",
    showTitle: true,
    items: [
      { href: "/personeller", key: "agents", icon: UserRound },
      { href: "/raporlar", key: "reports", icon: TrendingUp },
    ],
  },
  {
    key: "system",
    showTitle: false,
    items: [
      { href: "/bildirimler", key: "notifications", icon: Bell, badgeKey: "notifications" },
      { href: "/ayarlar", key: "settings", icon: Settings },
    ],
  },
];

/** Gruplardan bağımsız düz liste — arama ve route çözümlemesi için. */
export const navItems: NavItem[] = navigation.flatMap((group) => group.items);

/**
 * Mobil alt gezinme çubuğundaki öğeler.
 *
 * SEÇİM ÖLÇÜTÜ: telefonda en sık açılan modüller. Faz 16'dan beri menüdeki
 * on iki öğenin TAMAMI gerçek bir sayfaya bağlı, yani seçim artık "hangisi
 * çalışıyor" değil "hangisi sahada gerekiyor" sorusuna göre yapılıyor.
 *
 * Faz 9'da dört modül vardı; Faz 11'de Randevular da çalışır hale gelince
 * beşe çıktı. Sıralama sahadaki kullanıma göre: takvim, danışmanın telefonda
 * en sık açtığı ekranlardan biri (günün programı) ve müşterilerden hemen
 * sonra geliyor. Satışlar listede kalıyor ama en sağda — masa başı işi.
 *
 * Faz 12'de Mesajlar ve Evraklar da çalışır hale geldi ama alt çubuğa
 * GİRMEDİLER: beş slot dolu ve altıncı bir öğe 375 px'de dokunma hedeflerini
 * 60 px'in altına indiriyor. İkisi de çekmecede, bir dokunuş uzakta.
 *
 * Burada yalnızca ADRESLER duruyor, öğelerin kendisi değil — etiket, ikon ve
 * rozet yine `navigation` dizisinden geliyor. Tek kaynak ilkesi korunuyor.
 */
const MOBILE_PRIMARY_HREFS = [
  "/dashboard",
  "/ilanlar",
  "/musteriler",
  "/randevular",
  "/satislar",
] as const;

export const mobilePrimaryItems: NavItem[] = MOBILE_PRIMARY_HREFS.map(
  (href) => {
    const item = navItems.find((candidate) => candidate.href === href);
    if (!item) {
      throw new Error(
        `Alt gezinme çubuğu "${href}" adresini bekliyor ama navigation içinde yok.`,
      );
    }
    return item;
  },
);

/** Verilen pathname için eşleşen menü öğesini döner (alt route'ları da kapsar). */
export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
