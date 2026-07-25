# Emlak CRM

Gayrimenkul ekipleri için premium CRM arayüzü. **Faz 1** tamamlandı: tasarım
sistemi, layout iskeleti, route yapısı ve giriş akışı. Gerçek veri, auth ve API
bağlantısı henüz yok.

## Çalıştırma

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır ve `/login` ekranına yönlenir.

> **Dev server çalışırken `npm run build` çalıştırmayın.** İkisi de aynı `.next/`
> klasörünü kullanır; build, dev server'ın manifest ve chunk'larını ezer. Belirti
> kafa karıştırıcıdır: sayfa tamamen boş görünür, CSS dosyası 404 döner ve
> terminalde `__webpack_modules__[moduleId] is not a function` hatası çıkar.
> Kurtarma: dev server'ı durdurun, `.next` klasörünü silin, yeniden başlatın.

## Teknoloji

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui (new-york) · Framer Motion · next-themes · Lucide

> **Not:** TypeScript 5.x'e sabitlenmiştir. TypeScript 7 (native derleyici)
> Next.js 15.5 ile uyumsuz — `tsconfig` path alias'ları sessizce çalışmaz.

## Klasör yapısı

```
src/
├── app/
│   ├── (app)/              # Sidebar + navbar iskeletini paylaşan sayfalar
│   │   ├── layout.tsx      # AppShell sarmalayıcı
│   │   └── <13 route>/     # dashboard, ilanlar, musteriler, …
│   ├── login/              # Kabuk dışı, tam ekran giriş
│   ├── layout.tsx          # Root: Inter fontu, metadata, Providers
│   └── globals.css         # ★ Tasarım sisteminin tamamı
├── components/
│   ├── ui/                 # shadcn primitives (button, input, dialog, command…)
│   ├── layout/             # AppShell, Sidebar, Navbar, CommandPalette…
│   ├── auth/               # LoginForm, AuroraBackground
│   ├── brand/              # LogoMark
│   ├── empty-state.tsx     # Yeniden kullanılabilir boş durum
│   └── coming-soon.tsx     # Faz 1 sayfa gövdesi
├── config/
│   ├── navigation.ts       # ★ Menü / route / başlık / açıklama tek kaynağı
│   └── site.ts             # Ürün sabitleri, demo kullanıcı
├── hooks/
└── lib/utils.ts            # cn()
```

## Tasarım sistemi

Tüm token'lar [`src/app/globals.css`](src/app/globals.css) içinde tanımlıdır:
ham değerler `:root` altında, Tailwind utility eşlemesi `@theme inline` içinde.
**Component'lerde ham hex yazmayın**, semantic utility kullanın.

### Yüzeyler

| Token             | Değer     | Kullanım                     |
| ----------------- | --------- | ---------------------------- |
| `bg-canvas`       | `#0B0F19` | Uygulama arka planı          |
| `bg-canvas-subtle`| `#0E131F` | Sidebar / navbar             |
| `bg-surface`      | `#151B26` | Kart yüzeyi                  |
| `bg-surface-hover`| `#1B2230` | Kart hover — hafif aydınlanma|
| `bg-surface-active`| `#212A3A`| Basılı / seçili              |
| `bg-surface-inset`| `#0F1522` | Input, well                  |

### Diğer

- **Metin:** `text-foreground` · `text-secondary-foreground` · `text-muted-foreground`
- **Kenarlık:** `border-hairline` · `border-hairline-strong`
- **Marka:** `bg-brand` · `bg-brand-soft` · `text-violet`
- **Durum:** `success` · `warning` · `danger` (+ `-soft` varyantları)
- **Yarıçap:** `rounded-lg` 16px (buton/input) · `rounded-xl` 20px (kart) ·
  `rounded-2xl` 24px (modal)
- **Gölge:** `shadow-xs` → `shadow-lg`, ince ve yumuşak
- **Spacing:** 8px grid — çift adımlar kullanın (`2`=8, `4`=16, `6`=24, `8`=32)
- **Easing:** `ease-[var(--ease-out-quint)]` standart geçiş eğrisi

### Kompozit utility'ler

`surface-card` (kart tabanı) · `surface-card-interactive` (hover aydınlanması) ·
`glass` (blur + yarı saydam) · `hairline-top` (üst ışık çizgisi) ·
`text-gradient`

## Menü ve route ekleme

[`src/config/navigation.ts`](src/config/navigation.ts) tek kaynaktır — sidebar,
navbar başlığı, komut paleti ve empty state metinleri buradan beslenir.
Yeni bölüm eklerken:

1. `navigation` dizisine `NavItem` ekleyin (`href`, `label`, `icon`, `description`).
2. `src/app/(app)/<slug>/page.tsx` oluşturup `<ComingSoon href="/<slug>" />` döndürün.

## Faz 1 kapsamı dışında kalanlar

Gerçek auth · veri katmanı / API · mobil responsive · açık tema ·
çoklu dil (UI hazır, işlevsiz) · ESLint kurulumu
