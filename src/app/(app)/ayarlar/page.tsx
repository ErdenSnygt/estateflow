import type { Metadata } from "next";
import Link from "next/link";
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
import { isManagerRole } from "@/lib/agents";
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

export const metadata: Metadata = {
  title: "Ayarlar",
};

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
  const [agent, company] = await Promise.all([
    getCurrentAgent(),
    getCompanySettings(),
  ]);

  /* Personel kaydına bağlanmamış kullanıcıya form göstermenin anlamı yok:
     kaydedecek bir satırı yok. */
  if (!agent) {
    return (
      <div className="space-y-6 pb-4">
        <PageHeader
          title="Ayarlar"
          description="Profil, tercihler ve şirket bilgileri."
        />
        <AgentNotice />
      </div>
    );
  }

  const isManager = isManagerRole(agent.role);

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Ayarlar"
        description="Profilinizi, bildirim tercihlerinizi ve hesap güvenliğinizi buradan yönetin."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/profil">
              <UserRound className="size-4" />
              Profilimi gör
            </Link>
          </Button>
        }
      />

      {/* --- Profil --- */}
      <SettingsSection
        icon={UserRound}
        title="Profil"
        description="Fotoğrafınız, adınız ve iletişim bilgileriniz. Bu bilgiler ekip listesinde ve müşteri kayıtlarında görünür."
      >
        <ProfileForm agent={agent} />
      </SettingsSection>

      {/* --- Şifre --- */}
      <SettingsSection
        icon={KeyRound}
        title="Şifre"
        description="Hesabınıza giriş için kullandığınız şifreyi değiştirin."
      >
        <PasswordForm />
      </SettingsSection>

      {/* --- 2FA ---
          PLACEHOLDER VE BU BİLİNÇLİ BİR KARAR, eksiklik değil. Gerekçe
          aşağıdaki metinde ve README'de: Supabase TOTP'yi destekliyor ama
          bir açma/kapama anahtarı olarak sunulamıyor. */}
      <SettingsSection
        icon={ShieldCheck}
        title="İki adımlı doğrulama"
        description="Şifrenizin yanına ikinci bir doğrulama adımı ekler."
        badge="Yakında"
      >
        <SettingsPlaceholder>
          Supabase, doğrulayıcı uygulama (TOTP) ile iki adımlı doğrulamayı
          destekliyor — ama bu bir aç/kapa anahtarı değil: QR kodu okutma, kod
          doğrulama ve <strong>giriş akışına ikinci adım eklenmesi</strong>{" "}
          gerekiyor. Yalnızca kaydı yapıp girişte sormamak, olmayan bir
          güvenliği varmış gibi göstermek olurdu. Bu yüzden ayrı bir iş olarak
          bırakıldı.
        </SettingsPlaceholder>
      </SettingsSection>

      {/* --- Bildirim tercihleri --- */}
      <SettingsSection
        icon={Bell}
        title="Bildirim tercihleri"
        description="Hangi olaylarda bildirim almak istediğinizi seçin. Değişiklikler anında kaydedilir."
      >
        <NotificationPreferencesForm
          value={agent.notification_preferences}
        />
      </SettingsSection>

      {/* --- Görünüm ve dil --- */}
      <SettingsSection
        icon={Moon}
        title="Görünüm ve dil"
        description="Tema ve arayüz dili."
        badge="Yakında"
      >
        <div className="space-y-3">
          <SettingsPlaceholder>
            <strong className="text-secondary-foreground">Tema.</strong>{" "}
            Uygulama tek temayla (koyu) tasarlandı: tasarım token&apos;ları
            koyu zeminde ayırt edilebilir olacak şekilde seçildi ve açık tema
            bunların tamamının ikinci bir setini gerektiriyor. Yarım bir açık
            tema, kontrastı bozuk bir arayüz demekti. Altyapı hazır —
            <code className="mx-1 rounded bg-surface px-1 py-0.5 text-[11px]">
              globals.css
            </code>
            içindeki <code className="text-[11px]">light</code> varyantı
            bekliyor.
          </SettingsPlaceholder>

          <SettingsPlaceholder>
            <Globe className="mr-1 inline size-3.5" />
            <strong className="text-secondary-foreground">Dil.</strong> Arayüz
            metinleri şu an bileşenlerin içinde yazılı. Dil seçimi, önce bir
            çeviri katmanı (i18n) ve tüm metinlerin oradan okunması demek —
            sözlük olmadan açılır menü yalnızca tek seçenek gösterirdi.
          </SettingsPlaceholder>
        </div>
      </SettingsSection>

      {/* --- Şirket (yalnızca yönetici) --- */}
      {isManager && (
        <SettingsSection
          icon={Building2}
          title="Şirket bilgileri"
          description="Ofisin resmi bilgileri. Tüm ekip görür, yalnızca yöneticiler düzenleyebilir."
        >
          <CompanyForm settings={company} />
        </SettingsSection>
      )}

      {/* --- API anahtarları --- */}
      <SettingsSection
        icon={KeyRound}
        title="API anahtarları"
        description="Dış sistemlerin bu CRM'e erişmesi için üretilen anahtarlar."
        badge="Yakında"
      >
        <SettingsPlaceholder>
          Gerçek bir anahtar yönetimi; üretme, saklama (yalnızca özet),
          yetkilendirme kapsamı, iptal ve kullanım kaydı ister — kendi başına
          bir modül. Çalışmayan bir anahtar listesi göstermektense bölüm boş
          bırakıldı.
        </SettingsPlaceholder>
      </SettingsSection>
    </div>
  );
}
