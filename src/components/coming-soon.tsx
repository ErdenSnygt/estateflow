import { findNavItem } from "@/config/navigation";
import { EmptyState } from "@/components/empty-state";

/**
 * Faz 1 sayfa gövdesi. Başlık, ikon ve açıklamayı navigation config'inden
 * okur; böylece metin tek yerde yönetilir ve sayfalar tek satır kalır.
 */
export function ComingSoon({ href }: { href: string }) {
  const item = findNavItem(href);

  if (!item) {
    throw new Error(`navigation config içinde "${href}" bulunamadı.`);
  }

  return (
    <EmptyState
      icon={item.icon}
      title={`${item.label} modülü hazırlanıyor`}
      description={item.description}
    />
  );
}
