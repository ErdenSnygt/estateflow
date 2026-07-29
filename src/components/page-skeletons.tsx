import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ============================================================================
 * ORTAK YÜKLENME PARÇALARI
 * ============================================================================
 * Faz 15'e kadar yedi sayfada `loading.tsx` vardı, sekizinde yoktu — geç
 * eklenen modüller (Satışlar, Mesajlar, Evraklar, Bildirimler, Ayarlar,
 * Profil) atlanmıştı. O sayfalar veri beklerken bomboş kalıyordu.
 *
 * Eksikleri tamamlarken her dosyaya ayrı iskelet yazmak sekiz kez tekrar
 * demekti; sayfaların çoğu aynı üç parçadan oluşuyor: başlık, filtre çubuğu,
 * satır listesi. Parçalar burada, `loading.tsx` dosyaları yalnızca onları
 * diziyor.
 *
 * `dashboard-skeletons.tsx` AYRI KALDI: oradaki iskeletler KPI kartı ve
 * grafik gibi dashboard'a özgü şekiller; ortaklaştırmak iki farklı işi tek
 * dosyaya sıkıştırmak olurdu.
 *
 * ÖLÇÜLER GERÇEK BİLEŞENLERLE EŞLEŞMELİ. İskelet gerçekten çizilecek şeyden
 * farklı boyutta olursa yükleme bittiğinde sayfa zıplıyor — iskeletin varlık
 * sebebi tam da bunu önlemek.
 */

/** `PageHeader` ile aynı ölçüler: 22px başlık + 13.5px açıklama. */
export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withAction && <Skeleton className="h-9 w-32 rounded-lg" />}
    </div>
  );
}

/** `FilterRow` kabuğu — dört açılır menü genişliğinde. */
export function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-surface p-3">
      {[200, 170, 190, 190].map((width, index) => (
        <div key={index} className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 rounded-lg" style={{ width }} />
        </div>
      ))}
    </div>
  );
}

/** Tek satırlık kart listesi — Satışlar, Teklifler, Evraklar aynı şekil. */
export function ListRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="flex items-start gap-3 p-4">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-5 w-24 shrink-0 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Özet kutuları — Evraklar ve Profil sayfalarının üst şeridi. */
export function StatTilesSkeleton({
  count = 4,
  className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  /** Izgara gerçek sayfayla eşleşmeli; Evraklar beş kutu kullanıyor. */
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Ayarlar bölümü kabuğu. */
export function SettingsSectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="space-y-3 border-t border-hairline pt-5">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
