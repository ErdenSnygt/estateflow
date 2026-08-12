import { cn } from "@/lib/utils";

/**
 * ============================================================================
 * MÜŞTERİ AVATARI — YALNIZCA BAŞ HARFLER
 * ============================================================================
 * Fotoğraf YOK ve bu bilinçli. Önceki sürüm `avatar_url` doluysa görseli,
 * boşsa baş harfleri çiziyordu; seed de kayıtların çoğuna stok portre
 * yazıyordu.
 *
 * İki sebeple kaldırıldı:
 *
 *  1. GERÇEKÇİ DEĞİL. Bir emlak ofisi müşterisinin vesikalığını sisteme
 *     girmiyor — elinde adı ve telefonu var. Stok portreler, olmayan bir
 *     veriyi varmış gibi gösteriyordu.
 *  2. YANLIŞ İZLENİM. Rastgele kadın/erkek fotoğrafları listeyi bir sosyal
 *     ağ görünümüne çeviriyor ve kaydın kendisinden (bütçe, durum, son
 *     görüşme) dikkati alıyordu.
 *
 * `AgentAvatar` İLE FARKI: personel fotoğrafı DURUYOR. Orada veri gerçek —
 * danışman kendi profil fotoğrafını Ayarlar'dan yüklüyor.
 *
 * Baş harfler isimden türetiliyor (ilk iki kelimenin baş harfi): "Erden
 * Şahenk" → "EŞ". Türkçe büyütme kullanılıyor; `toUpperCase()` "i" harfini
 * "I" yapardı, doğrusu "İ".
 */
export function CustomerAvatar({
  name,
  size = 44,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("tr-TR");

  return (
    /* `aria-hidden`: baş harfler bir bilgi değil, adın kısaltması. Ekran
       okuyucu zaten yanındaki adı okuyor; "EŞ" diye ikinci kez duyurmak
       gürültü olurdu. */
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-inset font-medium text-secondary-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </div>
  );
}
