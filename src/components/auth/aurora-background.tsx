"use client";

import { motion } from "framer-motion";

/**
 * Login ekranının atmosferi: yavaşça sürüklenen renkli ışık lekeleri,
 * ince ızgara ve vinyet. Gece / lüks ofis hissi — dikkat dağıtmadan.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Ana marka lekesi */}
      <motion.div
        className="absolute -left-[10%] -top-[20%] size-[720px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(76,125,255,0.30), transparent 62%)",
        }}
        animate={{ x: [0, 90, -30, 0], y: [0, 60, 120, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Menekşe ikinci leke */}
      <motion.div
        className="absolute -right-[12%] top-[6%] size-[620px] rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(124,92,255,0.26), transparent 62%)",
        }}
        animate={{ x: [0, -70, 20, 0], y: [0, 90, 30, 0], scale: [1, 0.94, 1.1, 1] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* Alt taraftan sıcak, çok soluk bir yansıma */}
      <motion.div
        className="absolute bottom-[-25%] left-[30%] size-[560px] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(52,211,153,0.10), transparent 65%)",
        }}
        animate={{ x: [0, 60, -40, 0], y: [0, -50, -10, 0] }}
        transition={{ duration: 38, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* İnce ızgara — merkeze doğru sönümlenir */}
      <div
        className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(70%_60%_at_50%_50%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Vinyet — kenarları koyulaştırıp kartı öne çıkarır */}
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_45%,transparent,rgba(5,7,12,0.85))]" />
    </div>
  );
}
