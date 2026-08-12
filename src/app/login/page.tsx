import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuroraBackground } from "@/components/auth/aurora-background";
import { LoginForm } from "@/components/auth/login-form";

/* Sekme başlığı da dile bağlı. SAYFA DÜZEYİNDEKİ `metadata` sabit bir nesne
   olduğu için çeviri okuyamıyordu; `generateMetadata` asenkron çalışıyor ve
   çerezi görebiliyor. Diğer sayfaların başlıkları modül fazlarında aynı
   şekilde geçecek. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signIn") };
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-canvas px-6 py-12">
      <AuroraBackground />
      <LoginForm />
    </div>
  );
}
