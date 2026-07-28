import { headers } from "next/headers";

/**
 * ============================================================================
 * İSTEK TARAFINDAN CİHAZ TAHMİNİ
 * ============================================================================
 * Projede düzenin tamamı CSS breakpoint'leriyle çözülüyor ve öyle kalmalı —
 * bu dosya bir istisna ve gerekçesi dar: TAKVİMİN VARSAYILAN GÖRÜNÜMÜ.
 *
 * "Mobilde günlük, masaüstünde haftalık başla" bir düzen kararı değil, bir
 * BAŞLANGIÇ DEĞERİ kararı ve CSS ile ifade edilemiyor: iki görünüm aynı anda
 * çizilip biri gizlenseydi ileri/geri okları hangi birimle (gün mü, hafta mı)
 * hareket edeceğini bilemezdi. İstemcide `useMediaQuery` ile karar vermek de
 * çalışmıyordu — sunucu ekran genişliğini bilmediği için ilk boyama masaüstü
 * görünümünü çizer, hemen ardından mobil görünüme atlardı.
 *
 * `sec-ch-ua-mobile` Chromium'un varsayılan olarak gönderdiği düşük entropili
 * bir istemci ipucu; göndermeyen tarayıcılarda (Safari, Firefox) user-agent'a
 * düşülüyor. iPadOS masaüstü kimliği bildiriyor ve BU DOĞRU: tablette haftalık
 * ızgara rahatça sığıyor.
 *
 * Yanılması da ucuz: kullanıcı sekmeye tıkladığı anda görünüm URL'e yazılıyor
 * ve bu tahmin bir daha devreye girmiyor.
 */
export async function isMobileRequest(): Promise<boolean> {
  const headerList = await headers();

  const hint = headerList.get("sec-ch-ua-mobile");
  if (hint) return hint === "?1";

  const agent = headerList.get("user-agent") ?? "";
  return /Android|iPhone|iPod|Windows Phone|IEMobile/i.test(agent);
}
