import { AppShell } from "@/components/layout/app-shell";

/** Uygulama içi tüm sayfalar sidebar + navbar iskeletini paylaşır. */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
