import { getSession } from "@/lib/auth/server";
import { getUnreadMessageCount } from "@/lib/data/messages";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { AppShell } from "@/components/layout/app-shell";
import { DeactivatedNotice } from "@/components/auth/deactivated-notice";
import { NotificationBellServer } from "@/components/notifications/notification-bell-server";

/** Uygulama içi tüm sayfalar sidebar + navbar iskeletini paylaşır. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* Oturum tek yerde çözülür ve kabuğa verilir; navbar ile kullanıcı kartı
     onu context üzerinden okur. */
  const session = await getSession();

  /* GEZİNME ROZETLERİ CANLI (Faz 16 hata düzeltmesi).
     `navigation.ts` içinde Faz 1'den beri sabit sayılar duruyordu (4 ve 9);
     mesaj okunduğunda ya da bildirim temizlendiğinde değişmiyorlardı.
     Sayımlar burada, layout'ta yapılıyor — okuma işlemleri zaten
     `revalidatePath("/", "layout")` çağırdığı için rozet ilk çizimde
     düşüyor. İkisi paralel; oturumsuz kullanıcıda ikisi de 0 dönüyor. */
  const [unreadMessages, unreadNotifications] = await Promise.all([
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
  ]);

  /* PASİF HESAP KABUĞU HİÇ GÖRMEZ. Veritabanı ona zaten hiçbir satır
     döndürmüyor; kabuğu çizmek boş listeler ve sıfır KPI'lar göstermek
     olurdu — bozulmuş bir uygulamadan ayırt edilemez. Kontrol burada, tek
     yerde: her sayfa bu layout'un içinden geçiyor. */
  if (session && !session.isActive) {
    return <DeactivatedNotice name={session.name} />;
  }

  /* Zil SLOT olarak geçiyor, veri prop'u olarak değil: `AppShell` ve `Navbar`
     istemci bileşeni, bildirim sorgusu ise sunucuda. Gerekçe
     `components/notifications/notification-bell-server.tsx` başlığında. */
  return (
    <AppShell
      session={session}
      notificationBell={<NotificationBellServer />}
      navBadges={{
        messages: unreadMessages,
        notifications: unreadNotifications,
      }}
    >
      {children}
    </AppShell>
  );
}
