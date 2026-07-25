import { redirect } from "next/navigation";

/** Faz 1'de giriş noktası login ekranı. Auth eklenince oturum kontrolüne bağlanacak. */
export default function RootPage() {
  redirect("/login");
}
