import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Ayarlar",
};

export default function AyarlarPage() {
  return <ComingSoon href="/ayarlar" />;
}
