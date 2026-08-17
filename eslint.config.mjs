import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ESLint 9 flat config.
 *
 * Kurallar Next.js'in kendi paketinden gelir: `next/core-web-vitals`
 * (React Hooks + erişilebilirlik + Next'e özgü performans kuralları) ve
 * `next/typescript` (typescript-eslint önerilen set). Kendi kuralımızı
 * yalnızca gerekçesiyle birlikte ekliyoruz — aşağıya bakın.
 *
 * `eslint-config-next` sürümü Next sürümüyle aynı majörde tutulmalıdır;
 * 16.x, 15.5 üzerinde beklenmedik kurallar getiriyor.
 */
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    /* `.next-*` deseni `NEXT_DIST_DIR` ile açılan alternatif çıktı
       klasörlerini de kapsıyor (gerekçe `next.config.mjs` içinde) — derleme
       çıktısını lint'lemek 12 bin uyarı üretiyor ve hiçbiri bize ait değil. */
    ignores: [".next/**", ".next-*/**", "node_modules/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      /* Kullanılmayan değişkenler hata olsun, ama `_` ile başlayanlar
         bilinçli atlamalardır (ör. `catch (_error)`). */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default config;
