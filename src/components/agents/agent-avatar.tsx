import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Personel fotoğrafı — `CustomerAvatar` ile aynı sözleşme: `avatar_url` null
 * ise `agents.initials` gösterilir.
 *
 * Baş harfler burada isimden TÜRETİLMİYOR, tablodan geliyor. Müşterilerde
 * türetmek yeterliydi; personelde baş harfler ofisin belirlediği bir şey
 * (arayüzün başka yerlerinde de aynı iki harf görünüyor) ve "Ayşe Yılmaz" gibi
 * bir isimden otomatik üretim her zaman istenen sonucu vermiyor.
 */
export function AgentAvatar({
  name,
  initials,
  src,
  size = 44,
  className,
}: {
  name: string;
  initials: string;
  src: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-hairline",
        "bg-gradient-to-br from-brand to-violet",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <span
          className="flex size-full items-center justify-center font-semibold tracking-wide text-white"
          style={{ fontSize: Math.round(size * 0.34) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
