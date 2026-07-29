import {
  PageHeaderSkeleton,
  SettingsSectionSkeleton,
} from "@/components/page-skeletons";

/**
 * `/ayarlar` yüklenirken.
 *
 * Altı bölüm çiziliyor, yedi değil: şirket bölümü yalnızca yöneticilere
 * görünüyor ve iskelet aşamasında kullanıcının rolü henüz bilinmiyor. Eksik
 * göstermek, olmayan bir bölümü vaat etmekten iyi.
 */
export default function AyarlarLoading() {
  return (
    <div className="space-y-5 pb-4">
      <PageHeaderSkeleton withAction />
      <SettingsSectionSkeleton rows={4} />
      <SettingsSectionSkeleton rows={2} />
      <SettingsSectionSkeleton rows={1} />
      <SettingsSectionSkeleton rows={5} />
      <SettingsSectionSkeleton rows={2} />
      <SettingsSectionSkeleton rows={1} />
    </div>
  );
}
