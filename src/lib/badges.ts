import type { AgentPerformance } from "@/lib/data/agents";

/**
 * ============================================================================
 * ROZETLER — HESAPLANAN, SAKLANAN DEĞİL
 * ============================================================================
 * Profil sayfasındaki küçük başarı işaretleri.
 *
 * -----------------------------------------------------------------------------
 * NEDEN TABLO YOK
 * -----------------------------------------------------------------------------
 * "Rozet kazanma" bir OLAY gibi düşünülüp `agent_badges` tablosuna
 * yazılabilirdi. O yol üç şey daha isterdi:
 *
 *   1. Kazanma anını yakalayan tetikleyiciler — her satış, her ilan, her
 *      müşteri kaydında "bu kişi bir eşiği geçti mi" kontrolü.
 *   2. Geri alma mantığı: bir satış silinirse "İlk Satış" rozeti ne olacak?
 *   3. Geçmiş veriyi doldurma — tablo açıldığında mevcut 46 ilan ve 6 satış
 *      için rozetlerin geriye dönük hesaplanması.
 *
 * Oysa rozetin kendisi zaten bir SORGU SONUCU: "toplam satış ≥ 1". Veriden
 * türetince üçü de kendiliğinden çözülüyor — satış silinirse rozet de gider,
 * geçmiş veri zaten sayılır, tetikleyiciye gerek kalmaz.
 *
 * Bedeli: bir rozetin NE ZAMAN kazanıldığı bilinmiyor ("3 Mart'ta ilk satış")
 * ve bildirim gönderilemiyor. İkisi de bu görsel detay için gereksiz.
 *
 * Fonksiyon SAF: girdisi `getAgentPerformance()` çıktısı, yeni bir sorgu
 * açmıyor. Bu yüzden testten de geçebiliyor (`badges.test.ts`).
 */

export type Badge = {
  id: string;
  label: string;
  /** Rozetin neyi ifade ettiği — ipucu olarak gösteriliyor. */
  description: string;
  /** Kazanıldı mı; kazanılmayanlar da soluk halde gösteriliyor. */
  earned: boolean;
  /** İlerleme metni: "3 / 10" — yalnızca eşikli rozetlerde. */
  progress?: string;
};

/** Eşik tabanlı rozetlerin ortak kurgusu. */
type Threshold = {
  id: string;
  label: string;
  description: string;
  value: (performance: AgentPerformance) => number;
  target: number;
};

const THRESHOLDS: Threshold[] = [
  {
    id: "ilk-satis",
    label: "İlk Satış",
    description: "İlk kapanan işleminizi tamamladınız.",
    value: (performance) => performance.totalSales,
    target: 1,
  },
  {
    id: "on-ilan",
    label: "10 İlan",
    description: "Portföyünüze on ilan girdi.",
    value: (performance) => performance.totalListings,
    target: 10,
  },
  {
    id: "yirmi-musteri",
    label: "20 Müşteri",
    description: "Yirmi müşteri kaydı size atandı.",
    value: (performance) => performance.totalCustomers,
    target: 20,
  },
  {
    id: "bes-satis",
    label: "5 Satış",
    description: "Beş işlem kapattınız.",
    value: (performance) => performance.totalSales,
    target: 5,
  },
];

/**
 * Ciro eşiği ayrı tutuluyor: diğerleri "adet", bu "tutar" ve ilerleme metni
 * ham sayı olarak okunmaz (`12500000 / 10000000`). Etiket kısaltmayı çağıran
 * tarafa bırakıyoruz.
 */
const REVENUE_TARGET = 10_000_000;

export function computeBadges(performance: AgentPerformance): Badge[] {
  const badges: Badge[] = THRESHOLDS.map((threshold) => {
    const value = threshold.value(performance);
    const earned = value >= threshold.target;

    return {
      id: threshold.id,
      label: threshold.label,
      description: threshold.description,
      earned,
      /* Kazanılmış rozette ilerleme göstermek gereksiz gürültü; yalnızca
         hedefe gidenlerde anlamlı. */
      progress: earned ? undefined : `${value} / ${threshold.target}`,
    };
  });

  badges.push({
    id: "on-milyon-ciro",
    label: "10 Mn ₺ Ciro",
    description: "Toplam satış hacminiz 10 milyon TL'yi aştı.",
    earned: performance.totalRevenue >= REVENUE_TARGET,
    progress:
      performance.totalRevenue >= REVENUE_TARGET
        ? undefined
        : `%${Math.min(99, Math.floor((performance.totalRevenue / REVENUE_TARGET) * 100))}`,
  });

  /* Sıralama: kazanılanlar önce. Profil sayfasında göz önce neyin
     başarıldığına gitsin, eksiklere değil. Eşitlikte tanım sırası korunuyor
     (`sort` kararlı). */
  return badges.sort((a, b) => Number(b.earned) - Number(a.earned));
}

/** Kazanılan rozet sayısı — başlıkta "3 / 5" göstermek için. */
export function earnedCount(badges: Badge[]): number {
  return badges.filter((badge) => badge.earned).length;
}
