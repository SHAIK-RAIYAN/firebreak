# 10 — SEO, AIEO, Performance, Accessibility (Lighthouse targets)

> Targets on the deployed home page: **Lighthouse mobile — Performance ≥ 90, Accessibility 100, Best Practices 100, SEO 100. Desktop Performance ≥ 97.**
> Core Web Vitals (field, p75): LCP < 2.5 s, INP < 200 ms, CLS < 0.05.

---

## 1. Metadata (App Router metadata API)

`apps/web/src/app/layout.tsx`:
```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),          // e.g. https://firebreak.vercel.app
  title: { default: "Firebreak — Roll back bad deploys with proof", template: "%s · Firebreak" },
  description: "Firebreak finds the deploy that broke production, rolls it back on Vercel when you approve, and proves it recovered. With an MCP server built on NitroStack.",
  applicationName: "Firebreak",
  keywords: ["incident response", "rollback", "Vercel", "GitHub", "MCP", "NitroStack", "on-call", "deploy"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Firebreak", url: "/", title: "Firebreak — Stop the spread.", description: "Find the bad deploy, roll back with approval, prove recovery." },
  twitter: { card: "summary_large_image", title: "Firebreak — Stop the spread.", description: "Find the bad deploy, roll back with approval, prove recovery." },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0B0A0F" }, { media: "(prefers-color-scheme: light)", color: "#F6F4F0" }],
  colorScheme: "dark light",
};
```
- `app/app/layout.tsx` (product) and `(auth)` layout: `robots: { index: false, follow: false }`.
- Every public page sets its own `title`, `description`, `alternates.canonical`.
- `<html lang="en" suppressHydrationWarning>`.

## 2. Files Next generates from code

| File | Path | Notes |
|---|---|---|
| sitemap | `src/app/sitemap.ts` | `/`, `/docs/mcp`, `/privacy`, `/terms` with `lastModified` (build time), `changeFrequency`, `priority` (1, 0.7, 0.3, 0.3) |
| robots | `src/app/robots.ts` | allow `/`; disallow `/app/`, `/api/`, `/login`; explicitly allow AI crawlers on public pages; `sitemap: ${SITE}/sitemap.xml` |
| manifest | `src/app/manifest.ts` | name, short_name `Firebreak`, `start_url: "/app"`, `display: "standalone"`, `background_color: "#0B0A0F"`, `theme_color: "#0B0A0F"`, icons 192/512 (PNG from the solid mark) |
| OG image | `src/app/opengraph-image.tsx` (+ `twitter-image.tsx` re-export) | `ImageResponse` 1200×630: `#0B0A0F` background, hairline grid, the pixel flame mark drawn with divs, title "Stop the spread." in Departure Mono **.otf** (read with `readFile(join(process.cwd(), "src/assets/DepartureMono-Regular.otf"))` — woff2 is not supported by ImageResponse), subtitle in muted. Export `alt`, `size`, `contentType`. |
| icons | `src/app/icon.svg`, `apple-icon.png`, `favicon.ico` | from `docs/assets/logo-mark-solid.svg` |
| llms.txt | `src/app/llms.txt/route.ts` (GET → `text/plain; charset=utf-8`, `force-static`) | see §4 |
| llms-full.txt | `src/app/llms-full.txt/route.ts` | product spec summary + MCP tool list + FAQ in Markdown |

robots.ts:
```ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/app/", "/api/", "/login"] },
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: ["/", "/llms.txt", "/llms-full.txt", "/docs/"], disallow: ["/app/", "/api/"] },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
```

## 3. Structured data (JSON-LD)

In the home page (server component), one `<script type="application/ld+json">` per object, content `JSON.stringify(obj).replace(/</g, "\\u003c")`. Type with `schema-dts`. **Do not** use `next/script` for JSON-LD.
- `Organization` (name, url, logo `/icon.svg`).
- `SoftwareApplication`: `name: "Firebreak"`, `applicationCategory: "DeveloperApplication"`, `operatingSystem: "Web"`, `offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }`, `description`, `url`.
- `FAQPage` with the 6 FAQs from 09 §2.9 (text must match the visible answers exactly).
- `/docs/mcp`: `TechArticle` (headline, description, datePublished, author Organization).

## 4. AIEO (being understood by AI search and assistants)

- `llms.txt` (llmstxt.org format):
  ```markdown
  # Firebreak

  > Firebreak is an incident-response tool for teams shipping on Vercel and GitHub. It ranks the commits that likely broke production with deterministic evidence, proposes a rollback with preflight checks, executes it only after human approval, and verifies recovery with health checks. It exposes the same workflow through an MCP server built with NitroStack.

  ## Product
  - [How it works](https://<site>/#how-it-works): Detect, trace, propose, approve, execute, verify.
  - [Security](https://<site>/#security): Approval gates, drift checks, AES-256-GCM key storage, audit timeline.

  ## MCP
  - [Connect an MCP client](https://<site>/docs/mcp): Claude Code, Cursor, Claude Desktop, NitroStudio setup and the 9 tools.

  ## Optional
  - [Privacy](https://<site>/privacy)
  - [Terms](https://<site>/terms)
  ```
- Write factual, quotable sentences (what it does, for whom, with which platforms, limits like "Hobby plans can only roll back to the previous deployment").
- One `<h1>` per page; sections use `<h2>` with the visible label; FAQ uses real `<h3>` questions; tool names in `<code>`.
- `/docs/mcp` is plain, crawlable HTML (no client-only rendering of content).

## 5. Performance plan

### 5.1 Rendering
- Marketing pages are **static RSC**. Client components are islands: `SmoothScroll`, `Loader`, `AsciiFire`, `LoopSection` (GSAP), `TerrainSceneLazy`, `McpBeams`, `ThemeToggle`, FAQ accordion (shadcn is client — acceptable, small).
- No data fetching on the home page.
- `/app/*` is dynamic; first paint from server components; TanStack Query hydrates.

### 5.2 JavaScript budget (home page, gzip)
| Chunk | Budget |
|---|---|
| Framework + shared | as Next ships |
| Home islands initial (Lenis, GSAP core + ScrollTrigger + SplitText, Motion, AsciiFire, loader) | ≤ 110 KB |
| three + R3F + postprocessing (terrain) | lazy, **not** in initial; loaded only near the section |
| Per-route app pages | ≤ 120 KB beyond shared |
Check with `next build` output (and `@next/bundle-analyzer` behind `ANALYZE=true`). Use `optimizePackageImports` in `next.config.ts` for `lucide-react`, `motion`, `@radix-ui/*`.

### 5.3 Fonts
- `next/font` for all fonts (self-hosted, no layout shift; `display: "swap"`, `adjustFontFallback`).
- Preload only display + sans on marketing (`preload: true`), pixel font `preload: true` only because the hero ticker/labels use it above the fold; Geist Mono **only** in `/app` layout.
- Subset `latin`.

### 5.4 Images & media
- No raster images above the fold (hero is text + canvas). The terrain poster is AVIF ≤ 60 KB, `loading="lazy"`, explicit `width`/`height`.
- `next/image` for any raster (`sizes` set). SVG logos inline.

### 5.5 Canvas & animation cost
- AsciiFire: ≤ 2 ms/frame at 30 fps, paused when hidden/offscreen, DPR ≤ 2, glyph atlas (08 §7.1).
- GSAP ScrollTriggers created inside `useGSAP` with `scope`, killed on unmount; `ScrollTrigger.refresh()` after fonts load.
- Long sections below the fold: `content-visibility: auto; contain-intrinsic-size: 1px 1000px;` (not on pinned sections).
- No `will-change` sprinkled globally; only on elements while animating.

### 5.6 Loader vs LCP
- The loader's wordmark is **server-rendered text** (so LCP is early). Max loader time 2 s; returning visitors never see it (inline head script).
- The hero H1 is visible at first paint (no `opacity: 0` start state anywhere — SplitText animates `transform` only, 09 §2.2). Same rule for every above-the-fold text: never hide text until JavaScript runs. Lighthouse (cold, first visit) must still score ≥ 90 mobile — if it doesn't, reduce the max to 1.4 s before removing features.

### 5.7 Caching / headers (`next.config.ts`)
- Static assets: Next defaults (immutable).
- Security headers on all routes: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://github.com` (a full script CSP with nonces is roadmap — the inline theme/loader scripts would need nonces).
- API: `cache-control: no-store`.

### 5.8 Analytics
Vercel Web Analytics + Speed Insights (free, tiny, first-party) — optional; no other third-party scripts.

## 6. Accessibility checklist (WCAG 2.2 AA)

- [ ] Color contrast per 08 §3 (no new text colors).
- [ ] Visible `:focus-visible` outline on every interactive element; skip link "Skip to content" as the first focusable element.
- [ ] All icon-only buttons have `aria-label`; decorative canvases/SVGs `aria-hidden`.
- [ ] Landmarks: `header`, `nav`, `main`, `footer`; sidebar `nav aria-label="Primary"`.
- [ ] Dialogs (shadcn/Radix) trap focus and restore it; `Esc` closes.
- [ ] Live regions for incident status and toast messages.
- [ ] `HoldToConfirm` has a keyboard path and a non-hold confirm alternative.
- [ ] Reduced motion honoured everywhere (08 §6).
- [ ] Target size ≥ 24×24 CSS px (WCAG 2.2), ≥ 44 px for primary mobile controls.
- [ ] Forms: labels bound, errors linked with `aria-describedby`, no placeholder-only labels.
- [ ] Tables have `<th scope>`; status pills include text (not color alone).
- [ ] Page titles unique; `lang` set.
- [ ] Zoom to 200% without horizontal scroll at 1280 px; no horizontal page scroll at 360 px.

## 7. How to verify

```bash
pnpm turbo run build --filter=@firebreak/web && pnpm --filter @firebreak/web start
npx lighthouse http://localhost:3000 --preset=desktop --view
npx lighthouse http://localhost:3000 --form-factor=mobile --view   # default is mobile emulation
npx @axe-core/cli http://localhost:3000 http://localhost:3000/login
```
Then repeat against the production URL (PageSpeed Insights). Record scores in `CONTEXT.md` §0 "Last green check".
