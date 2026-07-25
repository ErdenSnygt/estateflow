import type { Metadata } from "next";

import { AuroraBackground } from "@/components/auth/aurora-background";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Giriş yap",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-canvas px-6 py-12">
      <AuroraBackground />
      <LoginForm />
    </div>
  );
}
