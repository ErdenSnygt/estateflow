import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Mesajlar",
};

export default function MesajlarPage() {
  return <ComingSoon href="/mesajlar" />;
}
