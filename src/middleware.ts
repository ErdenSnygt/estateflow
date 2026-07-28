import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/auth/session";

/**
 * (app) route grubu URL'de görünmediği için korumayı yol bazında değil,
 * "login ve auth geri dönüşü dışındaki her şey korumalı" kuralıyla kuruyoruz.
 * Yeni modül eklendiğinde burada değişiklik gerekmez.
 *
 * Faz 5'te iki şey değişti: kontrol async oldu (Supabase'e doğrulatılıyor) ve
 * `updateSession` bir yanıt döndürüyor — tazelenmiş oturum çerezleri o yanıtta
 * duruyor. Yönlendirme yaparken bu çerezler yeni yanıta KOPYALANMALI, yoksa
 * jeton her yenilendiğinde kullanıcı bir kez login ekranına düşer.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { session, response } = await updateSession(request);

  /** Yönlendirirken tazelenmiş oturum çerezlerini taşır. */
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  /* OAuth geri dönüşü: kod burada henüz oturuma çevrilmedi, yani session
     null. Korumaya takılırsa giriş hiçbir zaman tamamlanamaz. */
  if (pathname.startsWith("/auth/")) {
    return response;
  }

  if (pathname === "/") {
    return redirectTo(new URL(session ? "/dashboard" : "/login", request.url));
  }

  // Girişli kullanıcı login ekranını görmemeli.
  if (pathname === "/login") {
    if (session) {
      return redirectTo(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    // Giriş sonrası kullanıcıyı gitmek istediği sayfaya geri gönderelim.
    loginUrl.searchParams.set("next", pathname);
    return redirectTo(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /* Statik dosyalar ve Next iç yolları hariç her istek. */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
