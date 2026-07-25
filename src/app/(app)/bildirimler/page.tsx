import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Bildirimler",
};

export default function BildirimlerPage() {
  return <ComingSoon href="/bildirimler" />;
}
