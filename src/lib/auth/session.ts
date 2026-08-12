import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import type { Agent, AgentRole, Database } from "@/types/database";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * ============================================================================
 * OTURUM — TEK DEĞİŞİM NOKTASI
 * ============================================================================
 * Faz 2'de burada sahte bir çerez kontrolü vardı ve dosyanın başında şu not
 * duruyordu: "Supabase Auth'a geçerken YALNIZCA bu dosya değişir." Faz 5'te
 * sınandı — `Session` tipini kullanan taraflar (navbar, kullanıcı kartı,
 * dashboard karşılama başlığı) dokunulmadan çalışmaya devam etti.
 *
 * Bu dosya `next/headers` kullanmaz ve KULLANAMAZ: middleware edge runtime'da
 * çalışır. Sunucu bileşenleri tarafındaki karşılığı `lib/auth/server.ts` —
 * `getCurrentAgent()` de orada, çünkü personel kaydını okumak bir veritabanı
 * sorgusu ve o sorgunun istemcisi `next/headers`e bağlı.
 */

export type Session = {
  userId: string;
  email: string;
  /** Bağlı personel kaydının adı; yoksa auth üst verisinden ya da e-postadan. */
  name: string;
  /**
   * GÖRÜNEN unvan — "Kurucu Ortak", "Kiralama Uzmanı".
   *
   * Faz 7'ye kadar bu alanın adı `role`'dü ve gerçek yetki rolü `agentRole`
   * içinde duruyordu. İsimlendirme kafa karıştırıcıydı: rolü `danisman`a
   * düşürülmüş bir kullanıcının kartında hâlâ "Kurucu Ortak" yazıyordu ve
   * `role` alanına bakan biri bunu hata sanıyordu. Alan artık ne taşıdığını
   * söylüyor; yetki sorulacaksa `agentRole` var.
   */
  title: string;
  initials: string;
  /**
   * Giriş yapan kullanıcının personel kaydı — Faz 6'da eklendi.
   *
   * `null` olabilir ve bu gerçek bir durum: Supabase'de hesabı olan ama hiçbir
   * `agents` satırına bağlanmamış bir kullanıcı. RLS ona hiçbir satır
   * göstermez; arayüz de bunu boş liste yerine açık bir uyarı olarak gösterir.
   *
   * Middleware bu iki alanı DOLDURAMAZ (sorgu yapamaz) ve doldurmasına gerek
   * de yok: oradaki tek soru "oturum var mı".
   */
  agentId: string | null;
  agentRole: AgentRole | null;
  /**
   * Personel kaydı pasifleştirilmiş mi (Faz 10).
   *
   * Pasif kullanıcı GİRİŞ YAPABİLİR — Supabase Auth hesabı duruyor — ama
   * veritabanı ona hiçbir satır göstermez (`current_agent_id()` null döner).
   * Uygulama bu durumu boş ekranla değil, ne olduğunu söyleyen bir sayfayla
   * karşılıyor (`app/(app)/layout.tsx`).
   *
   * Kaydı olmayan kullanıcıda `true`: "pasifleştirilmiş" ile "hiç bağlanmamış"
   * farklı durumlar ve ikincisi `agentId === null` ile ayırt ediliyor.
   */
  isActive: boolean;
};

/** "Erden Saygut" → "ES" · "erden" → "E" */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

/**
 * Görünen ad ve unvan bulunamazsa kullanılacak metinler.
 *
 * Faz 25: bu iki yedek sabit Türkçeydi ("Kullanıcı", "Yetki bekliyor").
 * `toSession` saf ve senkron — aktif dili okuyamıyor — bu yüzden metinleri
 * ÇAĞIRAN veriyor (`lib/offers.ts` ve `lib/badges.ts` ile aynı sınır).
 * Middleware tarafı boş geçiyor ve bu doğru: oradaki oturumun tek işi
 * "giriş var mı" sorusunu yanıtlamak, adı hiçbir yerde çizilmiyor.
 */
export type SessionFallbacks = { name: string; title: string };

/**
 * Supabase kullanıcısını arayüzün beklediği şekle çevirir.
 *
 * PERSONEL KAYDI VARSA O KAZANIR. Auth üst verisi kullanıcının kendi yazdığı
 * (ya da Google'dan gelen) bir şey; personel kaydı ise ofisin yönettiği kayıt.
 * Bir danışmanın kendi profil adını değiştirerek ekip listesinde başka biri
 * gibi görünmesi anlamlı olmazdı.
 *
 * Personel kaydı yoksa isim üç yerden gelebilir: e-posta/şifre kaydında
 * `full_name`, Google'da `name`, hiçbiri yoksa e-postanın kullanıcı adı kısmı.
 */
export function toSession(
  user: User,
  agent?: Agent | null,
  fallbacks: SessionFallbacks = { name: "", title: "" },
): Session {
  const meta = user.user_metadata ?? {};
  const email = user.email ?? "";

  const name =
    agent?.full_name ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email.split("@")[0] ||
    fallbacks.name;

  return {
    userId: user.id,
    email,
    name,
    /* Unvan yoksa "yetkisiz" demek yerine durumu tarif ediyoruz: kullanıcı
       hesabını açmış ama henüz bir ofise bağlanmamış. */
    title: agent?.title || fallbacks.title,
    initials: agent?.initials || initialsOf(name),
    agentId: agent?.id ?? null,
    agentRole: agent?.role ?? null,
    isActive: agent ? agent.is_active : true,
  };
}

/**
 * Middleware tarafı: oturumu okur VE tazeler.
 *
 * Neden bir `response` de dönüyor: Supabase erişim jetonu süresi dolmuşsa
 * `getUser()` onu sessizce yeniler ve YENİ ÇEREZLERİ yazması gerekir. Bu
 * yazma yalnızca bir `NextResponse` üzerinden yapılabildiği için nesne
 * çağırana geri veriliyor; middleware onu ya olduğu gibi döndürür ya da
 * yönlendirme yanıtına kopyalar. Çerezler düşerse kullanıcı her jeton
 * yenilemesinde bir kez daha login ekranına atılır.
 */
export async function updateSession(request: NextRequest): Promise<{
  session: Session | null;
  response: NextResponse;
}> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  /* `getSession()` DEĞİL `getUser()`: ilki çerezdeki JWT'yi olduğu gibi
     güvenir, ikincisi Supabase'e doğrulatır. Yetkilendirme kararı vereceğimiz
     için doğrulanmış olanı kullanıyoruz. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { session: user ? toSession(user) : null, response };
}
