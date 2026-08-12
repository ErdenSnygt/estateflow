import type {
  AppointmentStatus,
  AppointmentType,
  CustomerEventType,
} from "@/types/database";
import type { ActionErrorKey } from "@/lib/actions/result";

/**
 * ============================================================================
 * RANDEVU ARAYÜZ SÖZLÜĞÜ VE KURALLARI
 * ============================================================================
 * `lib/offers.ts` ile aynı desende: etiketler, renkler ve durum kuralları
 * burada; veri katmanı yalnızca ham değeri taşır. Saf olduğu için hepsi
 * veritabanı olmadan test edilebiliyor (`appointments.test.ts`).
 */

/* ==========================================================================
   Kategoriler
   ========================================================================== */

/** Açılırlarda, filtrelerde ve renk anahtarında bu sırayla çiziliyor. */
export const APPOINTMENT_TYPES = [
  "ev_gezme",
  "telefon_gorusmesi",
  "ofis_gorusmesi",
  "sozlesme_imzalama",
  "diger",
] as const satisfies readonly AppointmentType[];

/**
 * ============================================================================
 * TÜRKÇE ETİKETLER — EKRAN İÇİN DEĞİL, KAYIT İÇİN
 * ============================================================================
 * Faz 21'de arayüz etiketleri sözlüğe taşındı (`appointments.type.*`) ama bu
 * iki eşleme KALDI ve dışa aktarılmıyor. Sebebi, ürettikleri metnin ekranda
 * değil VERİTABANINDA yaşaması:
 *
 *  · `appointmentTitle` başlığı boş bırakılan randevuya bir ad veriyor ve o ad
 *    `appointments.title` kolonuna, aktivite akışına ve bildirime YAZILIYOR.
 *  · `timelineDescription` müşterinin görüşme geçmişine satır yazıyor.
 *
 * Kaydedilmiş metin, yazıldıktan sonra okuyanın diline göre değişemez —
 * seed'deki ilan başlıkları gibi veri sayılıyor. İngilizce arayüzde açılan bir
 * randevunun başlığını "Viewing" yazıp Türkçe arayüzde öyle göstermek,
 * veritabanında iki dilin karışması demekti.
 *
 * DURUM etiketleri artık burada YOK: onları yalnızca `canTransition` hata
 * metni için tutuyorduk, o da Faz 22'de anahtara döndü ve çeviriye taşındı.
 */
const STORED_TYPE_LABELS: Record<AppointmentType, string> = {
  ev_gezme: "Ev gezme",
  telefon_gorusmesi: "Telefon görüşmesi",
  ofis_gorusmesi: "Ofis görüşmesi",
  sozlesme_imzalama: "Sözleşme imzalama",
  diger: "Diğer",
};

/**
 * Kategori renkleri.
 *
 * YENİ PALET AÇILMADI, `chart-1..5` kullanıldı. O beş renk zaten "koyu zeminde
 * birbirinden ayırt edilebilir" ölçütüyle seçilmişti (`globals.css`) ve
 * dashboard'daki kategori grafiğiyle aynı dili konuşuyor. Altıncı bir palet
 * tanımlamak, aynı işi yapan iki renk seti demekti.
 *
 * SINIF ADLARI TAM METİN OLARAK YAZILI — `bg-chart-${n}` gibi kurgulanmış bir
 * ad Tailwind'in tarayıcısına görünmez ve stil üretilmez. Bu yüzden beş satır
 * tekrar ediyor; alternatifi çalışmayan bir kısayol olurdu.
 */
export type AppointmentPalette = {
  /** Izgaradaki blok: yumuşak zemin + ince kenar. */
  block: string;
  /** Sol şerit, nokta, ay ızgarasındaki işaret. */
  accent: string;
  /** Metin ve ikon rengi. */
  text: string;
};

export const APPOINTMENT_TYPE_PALETTE: Record<
  AppointmentType,
  AppointmentPalette
> = {
  ev_gezme: {
    block: "bg-chart-1/15 border-chart-1/40 hover:bg-chart-1/25",
    accent: "bg-chart-1",
    text: "text-chart-1",
  },
  telefon_gorusmesi: {
    block: "bg-chart-2/15 border-chart-2/40 hover:bg-chart-2/25",
    accent: "bg-chart-2",
    text: "text-chart-2",
  },
  ofis_gorusmesi: {
    block: "bg-chart-3/15 border-chart-3/40 hover:bg-chart-3/25",
    accent: "bg-chart-3",
    text: "text-chart-3",
  },
  sozlesme_imzalama: {
    block: "bg-chart-4/15 border-chart-4/40 hover:bg-chart-4/25",
    accent: "bg-chart-4",
    text: "text-chart-4",
  },
  diger: {
    block: "bg-chart-5/15 border-chart-5/40 hover:bg-chart-5/25",
    accent: "bg-chart-5",
    text: "text-chart-5",
  },
};

/**
 * Randevu başlığı boş bırakılırsa kategori adı başlık olur.
 *
 * YALNIZCA SUNUCUDAN çağrılıyor (`lib/actions/appointments.ts`) ve çıktısı
 * kaydediliyor — o yüzden Türkçe. Formdaki yer tutucu aynı metni gösteriyor
 * ama oraya çeviriden geliyor; ikisi bilerek ayrı.
 */
export function appointmentTitle(
  title: string,
  type: AppointmentType,
): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : STORED_TYPE_LABELS[type];
}

/* ==========================================================================
   Durum
   ========================================================================== */

/** Filtre açılırında bu sırayla çiziliyor. */
export const APPOINTMENT_STATUSES = [
  "planlandi",
  "tamamlandi",
  "iptal",
] as const satisfies readonly AppointmentStatus[];

export const APPOINTMENT_STATUS_TONES: Record<
  AppointmentStatus,
  "brand" | "success" | "neutral"
> = {
  planlandi: "brand",
  tamamlandi: "success",
  /* İptal `danger` DEĞİL: kırmızı bir hatayı işaret eder, oysa randevunun
     iptali sıradan bir iş akışı olayı. */
  iptal: "neutral",
};

/**
 * Durum geçişleri.
 *
 * `lib/offers.ts`teki teklif kuralından FARKLI: burada terminal durum yok.
 * Yanlışlıkla "tamamlandı" işaretlenen bir randevu geri alınabilmeli — teklif
 * kabulünün aksine arkasında satış satırı, ilan durumu gibi bir zincir yok.
 * Tek yan etki müşteri çizelgesine düşen olay ve o da tekrar tetiklenmiyor
 * (gerekçe `lib/actions/appointments.ts` içinde).
 */
const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  planlandi: ["tamamlandi", "iptal"],
  tamamlandi: ["planlandi"],
  iptal: ["planlandi"],
};

/**
 * Geçiş reddi ARTIK METİN DEĞİL ANAHTAR taşıyor.
 *
 * Bu fonksiyon saf ve senkron; çeviriyi kendisi yapamaz (dil isteğe bağlı,
 * `getTranslations` asenkron). `params` içindeki değerler DURUM DEĞERLERİ —
 * çağıran action onları kendi sözlüğünden etikete çevirip `fail`e veriyor.
 * Gerekçenin tamamı `lib/actions/result.ts` başlığında.
 */
export type TransitionCheck =
  | { ok: true }
  | {
      ok: false;
      error: ActionErrorKey;
      params: Record<string, AppointmentStatus>;
    };

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): TransitionCheck {
  if (from === to) {
    return {
      ok: false,
      error: "appointmentAlreadyInStatus",
      params: { status: to },
    };
  }
  if (!TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      error: "appointmentTransitionNotAllowed",
      params: { from, to },
    };
  }
  return { ok: true };
}

export function availableTransitions(
  from: AppointmentStatus,
): AppointmentStatus[] {
  return [...TRANSITIONS[from]];
}

/** Sürükle-bırak ve saat düzenlemesi yalnızca planlı randevularda anlamlı. */
export function isReschedulable(status: AppointmentStatus): boolean {
  return status === "planlandi";
}

/* ==========================================================================
   Müşteri çizelgesi eşlemesi
   ========================================================================== */

/**
 * Tamamlanan randevu → müşteri çizelgesi olayı.
 *
 * Faz 4'teki örnek çizelgede "İlanı yerinde gezdi" satırları vardı ama onları
 * üreten bir kayıt yoktu; olay elle giriliyordu. Eşleme burada, ÇİZELGENİN
 * KENDİ OLAY TİPLERİNE: yeni bir olay tipi eklenmedi çünkü çizelge zaten
 * "ne oldu" sorusunu cevaplıyor, "bu bir randevuydu" bilgisi orada anlamsız.
 *
 * `sozlesme_imzalama` için `purchased` KULLANILMIYOR: satın alma çizelgeye
 * teklif kabul edildiğinde düşüyor (`actions/offers.ts`) ve iki kaynaktan aynı
 * olayın iki kez yazılması çizelgeyi yalancı yapardı. Sözleşme görüşmesi
 * pazarlık aşamasının parçası sayılıyor.
 */
const TIMELINE_EVENT: Record<AppointmentType, CustomerEventType> = {
  ev_gezme: "viewed",
  telefon_gorusmesi: "called",
  ofis_gorusmesi: "negotiation",
  sozlesme_imzalama: "negotiation",
  diger: "negotiation",
};

export function timelineEventFor(type: AppointmentType): CustomerEventType {
  return TIMELINE_EVENT[type];
}

/**
 * Çizelgeye yazılacak açıklama.
 *
 * Kısa özne kuralı: cümlenin fiilini çizelgenin kendisi kuruyor
 * (`CUSTOMER_EVENT_LABELS`), buraya yalnızca "neyin" bilgisi giriyor —
 * `activity_log.description` ile aynı yaklaşım.
 */
export function timelineDescription(input: {
  title: string;
  type: AppointmentType;
  listingTitle?: string | null;
  location?: string | null;
}): string {
  const parts = [appointmentTitle(input.title, input.type)];
  if (input.listingTitle) parts.push(input.listingTitle);
  else if (input.location) parts.push(input.location);
  return parts.join(" · ");
}

/* ==========================================================================
   Filtre seçenekleri
   ========================================================================== */

export const APPOINTMENT_FILTER_KEYS = ["type", "status", "agent"] as const;
