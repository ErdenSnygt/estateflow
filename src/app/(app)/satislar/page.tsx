import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Satışlar",
};

export default function SatislarPage() {
  return <ComingSoon href="/satislar" />;
}
