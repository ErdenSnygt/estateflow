import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Müşteri fotoğrafı. Kayıtların bir kısmında `avatar_url` null — o durumda
 * baş harfler gösterilir. `next/image` yerine düz `Image` + fallback yerine
 * koşul kullanıyoruz; boş src ile Image çalışmıyor.
 */
export function CustomerAvatar({
  name,
  src,
  size = 44,
  className,
}: {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-hairline bg-surface-inset",
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
          className="flex size-full items-center justify-center font-medium text-secondary-foreground"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
