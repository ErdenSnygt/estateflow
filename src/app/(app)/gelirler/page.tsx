import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Gelirler",
};

export default function GelirlerPage() {
  return <ComingSoon href="/gelirler" />;
}
