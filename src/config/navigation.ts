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
  Sparkles,
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
  /** Sidebar'da rozet olarak gösterilecek sayaç (şimdilik statik demo verisi). */
  badge?: number;
};

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
          "Yer gösterme ve görüşme takviminizi planlayın, ekibinizle paylaşın, hatırlatma alın.",
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
        badge: 4,
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
      {
        href: "/ai-asistan",
        label: "AI Asistan",
        icon: Sparkles,
        description:
          "İlan metni yazma, müşteri eşleştirme ve fiyat önerisi için yapay zekâ desteği.",
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
        badge: 9,
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

/** Verilen pathname için eşleşen menü öğesini döner (alt route'ları da kapsar). */
export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
