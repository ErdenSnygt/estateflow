import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Müşteriler",
};

export default function MusterilerPage() {
  return <ComingSoon href="/musteriler" />;
}
