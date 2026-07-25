import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Raporlar",
};

export default function RaporlarPage() {
  return <ComingSoon href="/raporlar" />;
}
