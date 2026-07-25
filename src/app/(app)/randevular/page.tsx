import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Randevular",
};

export default function RandevularPage() {
  return <ComingSoon href="/randevular" />;
}
