import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "AI Asistan",
};

export default function AiAsistanPage() {
  return <ComingSoon href="/ai-asistan" />;
}
