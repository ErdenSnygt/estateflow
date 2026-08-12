import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";

/**
 * ============================================================================
 * OAUTH GERİ DÖNÜŞÜ
 * ============================================================================
 * Google / Apple girişinden sonra tarayıcı buraya `?code=…` ile döner. Kod tek
 * kullanımlıktır ve oturum çerezine burada çevrilir — route handler seçilmesi
 * bilinçli: sunucu bileşenleri çerez YAZAMAZ.
 *
 * Bu yol middleware korumasının dışında (`/auth/` öneki): kullanıcının henüz
 * oturumu yok, korumaya takılsaydı giriş hiçbir zaman tamamlanamazdı.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  /* Sağlayıcı kullanıcı vazgeçtiğinde ya da yapılandırma hatalıysa kod yerine
     hata döndürür. */
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  /**
   * Açık yönlendirme (open redirect) koruması: `next` yalnızca bu sitedeki bir
   * yol olabilir. "//evil.com" tarayıcıda protokol-göreli mutlak adrestir,
   * bu yüzden tek eğik çizgi kontrolü yetmez.
   */
  const requested = searchParams.get("next") ?? "/dashboard";
  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";

  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`,
    );
  }

  if (!code) {
    /* Kendi ürettiğimiz TEK mesaj bu, dolayısıyla çevrilen de tek bu.
       Sağlayıcıdan gelen `providerError` ve Supabase'in `error.message`
       değeri dışarıdan geliyor ve İngilizce — onları çevirmek, olmayan bir
       sözlüğü uydurmak olurdu (bkz. README, "Neler çevrilmiyor"). */
    const t = await getTranslations("auth");
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(t("missingCode"))}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
