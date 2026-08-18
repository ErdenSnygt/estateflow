import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Bell,
  Building2,
  Globe,
  KeyRound,
  Moon,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { getCurrentAgent } from "@/lib/auth/server";
import { getCompanySettings } from "@/lib/data/company";
import { canViewAll } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { AgentNotice } from "@/components/layout/agent-notice";
import { Button } from "@/components/ui/button";
import {
  SettingsPlaceholder,
  SettingsSection,
} from "@/components/settings/settings-section";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { CompanyForm } from "@/components/settings/company-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.page");
  return { title: t("title") };
}

/**
 * ============================================================================
 * AYARLAR
 * ============================================================================
 * Yedi bölüm, tek sayfa. Sekme yapılmadı: bölümlerin hiçbiri kendi başına bir
 * ekranı dolduracak kadar uzun değil ve sekmeler kullanıcıyı aradığı ayarı
 * hangi sekmede olduğunu tahmin etmeye zorlar. Tek sayfada Ctrl+F çalışıyor.
 *
 * ŞİRKET BÖLÜMÜ YALNIZCA YÖNETİCİYE görünüyor — ama bu bir güvenlik katmanı
 * değil, gereksiz bir formu gizlemek. Asıl kapı RLS
 * (`company_settings_write`) ve action'ın ilk satırındaki rol kontrolü.
 */
export default async function AyarlarPage() {
  const [agent, company, t, tCommon] = await Promise.all([
    getCurrentAgent(),
    getCompanySettings(),
    getTranslations("settings"),
    getTranslations("common"),
  ]);

  /* Personel kaydına bağlanmamış kullanıcıya form göstermenin anlamı yok:
     kaydedecek bir satırı yok. */
  if (!agent) {
    return (
      <div className="space-y-6 pb-4">
        <PageHeader
          title={t("page.title")}
          description={t("page.fallbackDescription")}
        />
        <AgentNotice />
      </div>
    );
  }

  const isManager = canViewAll(agent.role);

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/profil">
              <UserRound className="size-4" />
              {t("page.viewProfile")}
            </Link>
          </Button>
        }
      />

      {/* --- Profil --- */}
      <SettingsSection
        icon={UserRound}
        title={t("profile.title")}
        description={t("profile.description")}
      >
        <ProfileForm agent={agent} />
      </SettingsSection>

      {/* --- Şifre --- */}
      <SettingsSection
        icon={KeyRound}
        title={t("password.title")}
        description={t("password.description")}
      >
        <PasswordForm />
      </SettingsSection>

      {/* --- 2FA ---
          PLACEHOLDER VE BU BİLİNÇLİ BİR KARAR, eksiklik değil. Gerekçe
          aşağıdaki metinde ve README'de: Supabase TOTP'yi destekliyor ama
          bir açma/kapama anahtarı olarak sunulamıyor. */}
      <SettingsSection
        icon={ShieldCheck}
        title={t("twoFactor.title")}
        description={t("twoFactor.description")}
        badge={tCommon("soonBadge")}
      >
        <SettingsPlaceholder>
          {t.rich("twoFactor.body", { b: (chunks) => <strong>{chunks}</strong> })}
        </SettingsPlaceholder>
      </SettingsSection>

      {/* --- Bildirim tercihleri --- */}
      <SettingsSection
        icon={Bell}
        title={t("notifications.title")}
        description={t("notifications.description")}
      >
        <NotificationPreferencesForm
          value={agent.notification_preferences}
        />
      </SettingsSection>

      {/* --- Görünüm ve dil ---
          ROZET KALDIRILDI (Faz 20). Faz 19'da bölüm "Yakında" işaretliydi ve o
          zaman doğruydu: ne tema ne dil çalışıyordu. Dil gerçek olunca rozet
          yanlış bilgi vermeye başladı — bölümün yarısı çalışıyor. Tema hâlâ
          beklemede ve bunu artık kendi açıklaması söylüyor.

          Faz 25: dil metni de güncellendi. "Çeviri modül modül ilerliyor"
          cümlesi doğruluğunu yitirdi — seri bitti. */}
      <SettingsSection
        icon={Moon}
        title={t("appearance.title")}
        description={t("appearance.description")}
      >
        <div className="space-y-3">
          <SettingsPlaceholder>
            {/* İki etiketli zengin metin: <b> bölümün adı, <c> dosya/değişken
                adı. Cümlenin akışı iki dilde farklı, o yüzden parçalara
                bölünmüyor. */}
            {t.rich("appearance.themeBody", {
              b: (chunks) => (
                <strong className="text-secondary-foreground">{chunks}</strong>
              ),
              c: (chunks) => (
                <code className="mx-1 rounded bg-surface px-1 py-0.5 text-[11px]">
                  {chunks}
                </code>
              ),
            })}
          </SettingsPlaceholder>

          {/* DİL ARTIK PLACEHOLDER DEĞİL — Faz 19.
              Buradaki metin, dil seçiminin neden bir "yakında" olmaktan
              çıktığını ve seçicinin nerede olduğunu söylüyor. Seçicinin
              KENDİSİ burada tekrarlanmıyor: navbar'da her sayfada duruyor ve
              aynı kontrolü iki yere koymak, hangisinin geçerli olduğu
              sorusunu doğururdu. */}
          <SettingsPlaceholder>
            <Globe className="mr-1 inline size-3.5" />
            {t.rich("appearance.languageBody", {
              b: (chunks) => (
                <strong className="text-secondary-foreground">{chunks}</strong>
              ),
            })}
          </SettingsPlaceholder>
        </div>
      </SettingsSection>

      {/* --- Şirket (yalnızca yönetici) --- */}
      {isManager && (
        <SettingsSection
          icon={Building2}
          title={t("company.title")}
          description={t("company.description")}
        >
          <CompanyForm settings={company} />
        </SettingsSection>
      )}

      {/* --- API anahtarları --- */}
      <SettingsSection
        icon={KeyRound}
        title={t("api.title")}
        description={t("api.description")}
        badge={tCommon("soonBadge")}
      >
        <SettingsPlaceholder>{t("api.body")}</SettingsPlaceholder>
      </SettingsSection>
    </div>
  );
}
