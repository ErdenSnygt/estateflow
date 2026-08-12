"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Kapak görseli + küçük resim gezinmesi. Klavye ile de gezilebilir;
 * ok tuşları galeriye odaklanıldığında çalışır.
 */
export function ListingGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const t = useTranslations("listings.gallery");
  const [index, setIndex] = React.useState(0);
  // Kaydırma yönü: animasyonun hangi taraftan geleceğini belirler.
  const [direction, setDirection] = React.useState(0);

  const go = React.useCallback(
    (next: number) => {
      const total = images.length;
      const target = (next + total) % total;
      setDirection(target > index || (index === total - 1 && target === 0) ? 1 : -1);
      setIndex(target);
    },
    [images.length, index],
  );

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label={t("aria", { title })}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          "surface-card group relative aspect-[16/10] overflow-hidden",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={images[index]}
              alt={t("imageAlt", { title, index: index + 1 })}
              fill
              priority={index === 0}
              sizes="(max-width: 1280px) 100vw, 860px"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <GalleryArrow
              side="left"
              onClick={() => go(index - 1)}
              label={t("previous")}
            />
            <GalleryArrow
              side="right"
              onClick={() => go(index + 1)}
              label={t("next")}
            />

            <span className="absolute bottom-3 right-3 rounded-md bg-[#05070C]/70 px-2 py-1 text-[11.5px] font-medium text-white backdrop-blur-sm">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, imageIndex) => (
            <button
              key={image}
              type="button"
              onClick={() => go(imageIndex)}
              aria-label={t("goTo", { index: imageIndex + 1 })}
              aria-current={imageIndex === index}
              className={cn(
                "relative aspect-[4/3] h-[68px] shrink-0 overflow-hidden rounded-lg border transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                imageIndex === index
                  ? "border-brand opacity-100"
                  : "border-hairline opacity-55 hover:opacity-90",
              )}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="92px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryArrow({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  /* Etiket DIŞARIDAN: bu yardımcı bileşen `useTranslations` çağırmıyor,
     çünkü aynı dosyadaki galeri zaten çağırıyor ve iki ayrı abonelik
     gereksiz. */
  label: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 -translate-y-1/2 rounded-full p-2",
        "bg-[#05070C]/60 text-white backdrop-blur-sm",
        "opacity-0 transition-all duration-200 group-hover:opacity-100 focus-visible:opacity-100",
        "hover:bg-[#05070C]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
