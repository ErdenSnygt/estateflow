"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { site } from "@/config/site";
import {
  signInWithPassword,
  signInWithProvider,
  type AuthError,
  type OAuthProvider,
} from "@/lib/auth/client";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppleMark, GoogleMark } from "@/components/auth/provider-marks";

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
  const t = useTranslations("auth");
  const tError = useTranslations("auth.errors");

  /* Anahtarın argümanları anahtara göre değişiyor; birlik hâlinde çağırınca
     next-intl hepsini birden istiyor. Eşleşmeyi `lib/auth/client.ts` garanti
     ediyor (`messages.test.ts` de denetliyor). */
  const authMessage = (error: AuthError) =>
    error.raw ?? tError(error.key, error.values as never);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pendingProvider, setPendingProvider] =
    React.useState<OAuthProvider | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* Sağlayıcıdan hatayla dönülmüşse (`/auth/callback` yönlendirir) göster.
     `useSearchParams` yerine doğrudan okuma: bu bileşen Suspense sınırı
     istemesin, giriş ekranı ilk boyamada eksiksiz çıksın. */
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("error");
    if (message) setError(message);
  }, []);

  /** Middleware'in `?next=` ile geri gönderdiği hedef. */
  const nextPath = () =>
    new URLSearchParams(window.location.search).get("next") ?? "/dashboard";

  const busy = isSubmitting || pendingProvider !== null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const data = new FormData(event.currentTarget);
    const result = await signInWithPassword(
      String(data.get("email") ?? ""),
      String(data.get("password") ?? ""),
    );

    if (!result.ok) {
      setError(authMessage(result.error));
      setIsSubmitting(false);
      return;
    }

    /* `refresh()` şart: oturum çerezi yazıldı ama sunucu bileşenlerinin
       önbelleğe alınmış çıktısı hâlâ "girişsiz" hâli gösteriyor. */
    router.push(nextPath());
    router.refresh();
  }

  async function handleProvider(provider: OAuthProvider) {
    setError(null);
    setPendingProvider(provider);

    const result = await signInWithProvider(provider, nextPath());

    /* Başarılıysa tarayıcı sağlayıcıya gider ve buraya dönülmez. */
    if (!result.ok) {
      setError(authMessage(result.error));
      setPendingProvider(null);
    }
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
          {t("subtitle")}
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
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-danger"
            >
              {error}
            </motion.p>
          )}

          <motion.div variants={fadeUp} className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                className="pl-10"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href="#"
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-brand"
              >
                {t("forgotPassword")}
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
                aria-label={t(showPassword ? "hidePassword" : "showPassword")}
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
            {t("rememberMe")}
          </motion.label>

          <motion.div variants={fadeUp}>
            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className="group w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("signingIn")}
                </>
              ) : (
                <>
                  {t("signIn")}
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </motion.div>

          {/* --- Sağlayıcı girişleri --- */}
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline-strong" />
            <span className="text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("or")}
            </span>
            <span className="h-px flex-1 bg-hairline-strong" />
          </motion.div>

          <motion.div variants={fadeUp} className="grid gap-2.5">
            <ProviderButton
              onClick={() => handleProvider("google")}
              disabled={busy}
              pending={pendingProvider === "google"}
              icon={<GoogleMark className="size-[17px]" />}
              label={t("continueWithGoogle")}
              redirectingLabel={t("redirecting")}
            />
            <ProviderButton
              onClick={() => handleProvider("apple")}
              disabled={busy}
              pending={pendingProvider === "apple"}
              icon={<AppleMark className="size-[19px]" />}
              label={t("continueWithApple")}
              redirectingLabel={t("redirecting")}
            />
          </motion.div>
        </form>
      </motion.div>

      <motion.p
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="mt-6 text-center text-[12.5px] text-muted-foreground"
      >
        {t("noAccount")}{" "}
        <Link
          href="#"
          className="font-medium text-secondary-foreground transition-colors hover:text-brand"
        >
          {t("requestDemo")}
        </Link>
      </motion.p>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Sağlayıcı butonu.
 *
 * `Button` bileşeninin `secondary` varyantı yerine kendi kabuğu var: marka
 * butonlarında ikon solda sabit, metin ortada durmalı ve yükseklik e-posta
 * girişindeki `size="lg"` ile aynı olmalı.
 */
function ProviderButton({
  onClick,
  disabled,
  pending,
  icon,
  label,
  redirectingLabel,
}: {
  onClick: () => void;
  disabled: boolean;
  pending: boolean;
  icon: React.ReactNode;
  label: string;
  /* Cevirmen kanca ile geliyor ve bu bilesen ayni dosyada ama BILESEN
     DISINDA tanimli; prop olarak gecmek en kisa yol. */
  redirectingLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex h-11 w-full items-center justify-center gap-2.5 rounded-lg",
        "border border-hairline-strong bg-surface-inset text-[13.5px] font-medium text-foreground",
        "transition-colors hover:bg-surface-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <span className="absolute left-4 flex items-center">{icon}</span>
      )}
      {pending ? redirectingLabel : label}
    </button>
  );
}
