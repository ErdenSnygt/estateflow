import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Personeller",
};

export default function PersonellerPage() {
  return <ComingSoon href="/personeller" />;
}
