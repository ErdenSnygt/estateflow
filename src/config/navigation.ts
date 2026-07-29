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
  /** Sidebar'da ve navbar başlığında görünen ad. */
  label: string;
  icon: LucideIcon;
  /** Empty state ve arama modalında gösterilen kısa açıklama. */
  description: string;
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

export type NavGroup = {
  /** Sidebar'da gösterilen grup başlığı; null ise başlıksız grup. */
  title: string | null;
  /** Komut paletinde kullanılan başlık — sidebar'da başlıksız gruplar için gerekli. */
  paletteTitle: string;
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    title: null,
    paletteTitle: "Genel",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description:
          "Portföyünüzün genel görünümü, güncel metrikler ve günlük özet tek ekranda toplanacak.",
      },
    ],
  },
  {
    title: "Portföy",
    paletteTitle: "Portföy",
    items: [
      {
        href: "/ilanlar",
        label: "İlanlar",
        icon: Building2,
        description:
          "Tüm gayrimenkul portföyünüzü listeleyin, fotoğraf ve detaylarıyla yönetin, portallara yayınlayın.",
      },
      {
        href: "/musteriler",
        label: "Müşteriler",
        icon: Users,
        description:
          "Alıcı ve satıcı kayıtları, talep eşleştirme ve müşteri geçmişi burada takip edilecek.",
      },
      {
        href: "/randevular",
        label: "Randevular",
        icon: CalendarDays,
        description:
          "Yer gösterme ve görüşme takviminizi günlük, haftalık ve aylık görünümde planlayın.",
      },
    ],
  },
  {
    title: "İletişim",
    paletteTitle: "İletişim",
    items: [
      {
        href: "/mesajlar",
        label: "Mesajlar",
        icon: MessageSquare,
        description:
          "Müşteri yazışmalarınızı tek gelen kutusunda toplayın, ekip içinde devredin.",
        badgeKey: "messages",
      },
      {
        href: "/evraklar",
        label: "Evraklar",
        icon: FileText,
        description:
          "Sözleşme, tapu ve yetki belgelerini güvenle saklayın, sürüm geçmişiyle takip edin.",
      },
    ],
  },
  {
    title: "Finans",
    paletteTitle: "Finans",
    items: [
      {
        href: "/satislar",
        label: "Satışlar",
        icon: Receipt,
        description:
          "Satış ve kiralama süreçlerini aşama aşama izleyin, kapanan işlemleri raporlayın.",
      },
      {
        href: "/gelirler",
        label: "Gelirler",
        icon: Wallet,
        description:
          "Komisyon gelirlerinizi, tahsilat durumunu ve dönemsel kazancınızı görüntüleyin.",
      },
    ],
  },
  {
    title: "Yönetim",
    paletteTitle: "Yönetim",
    items: [
      {
        href: "/personeller",
        label: "Personeller",
        icon: UserRound,
        description:
          "Ekip üyelerini davet edin, yetki seviyelerini ve performanslarını yönetin.",
      },
      {
        href: "/raporlar",
        label: "Raporlar",
        icon: TrendingUp,
        description:
          "Portföy, satış ve ekip performansına dair detaylı analizleri buradan alacaksınız.",
      },
    ],
  },
  {
    title: null,
    paletteTitle: "Sistem",
    items: [
      {
        href: "/bildirimler",
        label: "Bildirimler",
        icon: Bell,
        description:
          "Sistem uyarıları, hatırlatmalar ve ekip bildirimleri tek akışta toplanacak.",
        badgeKey: "notifications",
      },
      {
        href: "/ayarlar",
        label: "Ayarlar",
        icon: Settings,
        description:
          "Hesap, ofis, fatura ve entegrasyon ayarlarınızı buradan yöneteceksiniz.",
      },
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
