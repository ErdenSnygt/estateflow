import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Evraklar",
};

export default function EvraklarPage() {
  return <ComingSoon href="/evraklar" />;
}
