import Link from "next/link";
import { FileText } from "lucide-react";

import type { DocumentItem } from "@/lib/data/documents";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_TONES } from "@/lib/messaging";
import { formatBytes } from "@/lib/storage/paths";
import { formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Müşteri ve ilan detayındaki "İlgili Evraklar" mini listesi.
 *
 * İNDİRME DÜĞMESİ YOK, yalnızca özet. Evrak sayfasındaki satır (`DocumentRow`)
 * imzalı URL üretmek için istemci bileşeni olmak zorunda; buradaki liste ise
 * sunucuda çiziliyor ve detay sayfasına istemci yükü eklemiyor. İndirmek
 * isteyen kullanıcı "Tümünü gör" ile filtrelenmiş evrak sayfasına gidiyor.
 */
export function RelatedDocuments({
  documents,
  filterHref,
}: {
  documents: DocumentItem[];
  /** `/evraklar?customer=…` gibi önceden filtrelenmiş adres. */
  filterHref: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>İlgili Evraklar</CardTitle>
        {documents.length > 0 && (
          <Link
            href={filterHref}
            className="text-[12.5px] font-medium text-brand transition-colors hover:text-brand-strong"
          >
            Tümünü gör
          </Link>
        )}
      </CardHeader>

      <CardContent className="pt-3">
        {documents.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Henüz belge yüklenmemiş.{" "}
            <Link
              href="/evraklar"
              className="text-brand transition-colors hover:text-brand-strong"
            >
              Evraklar
            </Link>{" "}
            sayfasından tapu, kimlik ya da sözleşme ekleyebilirsiniz.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => (
              <Link
                key={document.id}
                href={filterHref}
                className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2 transition-colors hover:bg-surface-hover"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {document.title}
                  </p>
                  <p className="text-[11.5px] tabular-nums text-muted-foreground">
                    {formatShortDate(document.created_at)} ·{" "}
                    {formatBytes(document.file_size)}
                  </p>
                </div>

                <Badge variant={DOCUMENT_TYPE_TONES[document.document_type]}>
                  {DOCUMENT_TYPE_LABELS[document.document_type]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
