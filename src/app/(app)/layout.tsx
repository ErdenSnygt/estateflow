import { getSession } from "@/lib/auth/server";
import { AppShell } from "@/components/layout/app-shell";
import { DeactivatedNotice } from "@/components/auth/deactivated-notice";

/** Uygulama içi tüm sayfalar sidebar + navbar iskeletini paylaşır. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* Oturum tek yerde çözülür ve kabuğa verilir; navbar ile kullanıcı kartı
     onu context üzerinden okur. */
  const session = await getSession();

  /* PASİF HESAP KABUĞU HİÇ GÖRMEZ. Veritabanı ona zaten hiçbir satır
     döndürmüyor; kabuğu çizmek boş listeler ve sıfır KPI'lar göstermek
     olurdu — bozulmuş bir uygulamadan ayırt edilemez. Kontrol burada, tek
     yerde: her sayfa bu layout'un içinden geçiyor. */
  if (session && !session.isActive) {
    return <DeactivatedNotice name={session.name} />;
  }

  return <AppShell session={session}>{children}</AppShell>;
}
