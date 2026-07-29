import { describe, expect, it } from "vitest";

import {
  formatBytes,
  MAX_UPLOAD_BYTES,
  parseStorageUrl,
  publicUrlFor,
  PUBLIC_BUCKETS,
} from "@/lib/storage/paths";

/**
 * `parseStorageUrl` iki yönde de tehlikeli bir fonksiyon.
 *
 * FAZLA DAR eşleşirse: silme akışı bizim dosyalarımızı tanımaz, ilan silinir
 * ama görselleri bucket'ta kalır — sessiz şişme.
 *
 * FAZLA GENİŞ eşleşirse: seed'den gelen dış adresleri (picsum, pravatar) bizim
 * sanıp silmeye çalışır. Bugün zararsız (o dosyalar bizim değil) ama yarın
 * başka bir bucket eklendiğinde yanlış dosya silinebilir.
 *
 * Ortam değişkeni testte `https://test-project.supabase.co` (bkz.
 * `vitest.config.ts`).
 */

const HOST = "https://test-project.supabase.co";
const PREFIX = `${HOST}/storage/v1/object/public`;

describe("publicUrlFor", () => {
  it("bucket ve yolu tam adrese çevirir", () => {
    expect(publicUrlFor("listings", "abc.webp")).toBe(`${PREFIX}/listings/abc.webp`);
    expect(publicUrlFor("avatars", "xyz.jpg")).toBe(`${PREFIX}/avatars/xyz.jpg`);
  });

  it("ürettiği adres geri ayrıştırılabilir", () => {
    /* PUBLIC_BUCKETS, STORAGE_BUCKETS değil: Faz 12'de eklenen `documents`
       private ve public bir adresi hiç yok. */
    for (const bucket of PUBLIC_BUCKETS) {
      const path = "9f8c-1234.webp";
      expect(parseStorageUrl(publicUrlFor(bucket, path))).toEqual({
        bucket,
        path,
      });
    }
  });
});

describe("parseStorageUrl — bizim dosyalarımız", () => {
  it("geçerli adresi bucket ve yola ayırır", () => {
    expect(parseStorageUrl(`${PREFIX}/listings/foto.webp`)).toEqual({
      bucket: "listings",
      path: "foto.webp",
    });
  });

  it("sorgu dizesini yola dahil etmez", () => {
    /* Önbellek kırıcı parametre eklenmiş bir adres silinmeye çalışıldığında
       Storage `foto.webp?t=123` diye bir dosya arar ve bulamaz. */
    expect(parseStorageUrl(`${PREFIX}/avatars/foto.webp?t=1730000000`)).toEqual({
      bucket: "avatars",
      path: "foto.webp",
    });
  });

  it("yol içinde eğik çizgi olsa da korunur", () => {
    expect(parseStorageUrl(`${PREFIX}/listings/2026/07/foto.webp`)).toEqual({
      bucket: "listings",
      path: "2026/07/foto.webp",
    });
  });
});

describe("parseStorageUrl — bize ait olmayan adresler", () => {
  it("seed görsellerini tanımaz", () => {
    expect(parseStorageUrl("https://picsum.photos/seed/1/800/600")).toBeNull();
    expect(parseStorageUrl("https://i.pravatar.cc/300?img=4")).toBeNull();
    expect(
      parseStorageUrl("https://fastly.picsum.photos/id/1/800/600.jpg"),
    ).toBeNull();
  });

  it("başka bir Supabase projesini tanımaz", () => {
    expect(
      parseStorageUrl(
        "https://baska-proje.supabase.co/storage/v1/object/public/listings/x.webp",
      ),
    ).toBeNull();
  });

  it("tanımadığımız bucket'ı reddeder", () => {
    expect(parseStorageUrl(`${PREFIX}/evraklar/sozlesme.webp`)).toBeNull();
  });

  it("private (imzalı) adresi tanımaz", () => {
    /* Bucket'lar public; `/object/sign/` yolu farklı bir uç nokta ve bugün
       kullanılmıyor. Sessizce eşleşmesi ileride yanlış silme üretirdi. */
    expect(
      parseStorageUrl(`${HOST}/storage/v1/object/sign/listings/x.webp`),
    ).toBeNull();
  });

  it("bozuk ve eksik girdilerde çökmez", () => {
    expect(parseStorageUrl("")).toBeNull();
    expect(parseStorageUrl("blob:http://localhost:3000/abc-def")).toBeNull();
    expect(parseStorageUrl("/storage/v1/object/public/listings/x.webp")).toBeNull();
    expect(parseStorageUrl(`${PREFIX}/listings/`)).toBeNull();
    expect(parseStorageUrl(`${PREFIX}/listings`)).toBeNull();
    expect(parseStorageUrl(`${PREFIX}/`)).toBeNull();
  });

  it("Faz 7 öncesinden kalmış blob adresini tanımaz", () => {
    /* Veritabanında böyle bir kayıt kalmadı ama bir gün çıkarsa silme akışı
       onu bizim dosyamız sanmamalı. */
    expect(
      parseStorageUrl("blob:http://localhost:3000/7e5dd616-4be1-4b41"),
    ).toBeNull();
  });
});

describe("formatBytes", () => {
  it("bir MB üstünü MB, altını KB gösterir", () => {
    expect(formatBytes(8 * 1024 * 1024)).toBe("8,0 MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1,5 MB");
    expect(formatBytes(400 * 1024)).toBe("400 KB");
  });

  it("Türkçe ondalık ayracı kullanır", () => {
    expect(formatBytes(2.4 * 1024 * 1024)).toContain(",");
    expect(formatBytes(2.4 * 1024 * 1024)).not.toContain(".");
  });

  it("yükleme sınırı okunabilir bir değer üretir", () => {
    expect(formatBytes(MAX_UPLOAD_BYTES)).toBe("8,0 MB");
  });
});
