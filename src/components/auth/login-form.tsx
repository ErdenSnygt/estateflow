"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { site } from "@/config/site";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Giriş öğelerinin sırayla belirmesi için ortak varyant. */
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/** Çocukları sırayla tetikleyen kapsayıcı varyantı. */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  /** Faz 1'de gerçek auth yok — yalnızca akış simülasyonu. */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => router.push("/dashboard"), 900);
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="relative w-full max-w-[408px]"
    >
      {/* Logo — fade + scale girişi */}
      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex flex-col items-center"
      >
        <LogoMark className="size-12 rounded-[16px]" />
        <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.025em] text-foreground">
          {site.name}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Hesabınıza giriş yaparak devam edin
        </p>
      </motion.div>

      {/* Kart */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "hairline-top glass rounded-2xl p-7",
          "shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)]",
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div variants={fadeUp} className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ornek@emlakofisi.com"
                className="pl-10"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Şifre</Label>
              <Link
                href="#"
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-brand"
              >
                Şifremi unuttum
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="px-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5",
                  "text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground",
                )}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </motion.div>

          <motion.label
            variants={fadeUp}
            className="flex cursor-pointer items-center gap-2.5 text-[13px] text-secondary-foreground"
          >
            <input
              type="checkbox"
              defaultChecked
              className={cn(
                "size-4 appearance-none rounded-[5px] border border-hairline-strong bg-surface-inset",
                "transition-all duration-150 checked:border-brand checked:bg-brand",
                "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%2220 6 9 17 4 12%22/></svg>')]",
                "checked:bg-[length:11px_11px] checked:bg-center checked:bg-no-repeat",
                "focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
            Beni hatırla
          </motion.label>

          <motion.div variants={fadeUp}>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="group w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Giriş yapılıyor…
                </>
              ) : (
                <>
                  Giriş yap
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>

      <motion.p
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="mt-6 text-center text-[12.5px] text-muted-foreground"
      >
        Hesabınız yok mu?{" "}
        <Link
          href="#"
          className="font-medium text-secondary-foreground transition-colors hover:text-brand"
        >
          Demo talep edin
        </Link>
      </motion.p>
    </motion.div>
  );
}
