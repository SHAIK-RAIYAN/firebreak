# 08 — Frontend Design System (brand, tokens, type, motion, components)

> Think like a design engineer: every pixel has a reason, every animation communicates state.
> Design concept: **"Night shift."** An operator's console crossed with an editorial poster. Calm, precise, a little dangerous.
> The product metaphor drives everything: **fire spreads; a firebreak is a deliberate gap that stops it.**

---

## 1. Anti-slop rules (hard bans)

- No sparkles ✨, robots, brains, magic wands, "AI" chips, or glowing orbs. No lucide `Sparkles`, `Bot`, `Brain`, `Wand*`, `Stars` icons anywhere.
- No purple-to-blue gradient blobs, no aurora backgrounds, no glassmorphism cards, no floating 3D blobs, no generic "three feature cards in a row" section, no fake logo walls, no fake testimonials, no fake metrics.
- No copy words: *AI-powered, magic, revolutionary, seamless, unleash, supercharge, effortless, next-gen, cutting-edge, game-changer, in seconds* (show the number instead).
- No emoji in UI. No centered-everything layouts. No drop shadows as the main depth cue (use hairlines + surfaces).
- One heavy visual effect per viewport (ASCII fire, three.js terrain, or pinned scroll) — never two at once.
- Purple is **fire**, not "AI". It appears as heat (glyphs, the mark, focus rings, live states) — not as a background wash.

## 2. Brand

| | |
|---|---|
| Name | **Firebreak** (wordmark lowercase: `firebreak`) |
| Tagline | **Stop the spread.** |
| Sub-tagline | Roll back bad deploys with proof. |
| Voice | On-call engineer at 2 a.m.: short, factual, numbers over adjectives. Present tense. Second person. |
| Vocabulary | incident, deploy, roll back, suspect, evidence, preflight, approve, verify, recovered, blast radius, production. |
| Logo | Pixel mark on an 8×10 grid: a 5-column flame + one **cleared column** (the break) + 2 columns of dim embers that did not cross. Files: `docs/assets/logo-mark.svg` (gapped pixels, ≥ 24 px) and `logo-mark-solid.svg` (favicon/16 px). Preview: `docs/assets/logo-preview.png`. |
| Lockup | Mark + wordmark in Mona Sans, weight 700, width 112, tracking −0.04em; gap = 0.35 × cap height. |
| Clear space | ≥ 1 pixel-cell of the mark on every side. Never recolor the mark except the monochrome variant (`currentColor`) for dense UI (sidebar collapsed). |

Favicon set: `app/icon.svg` (solid mark), `app/apple-icon.png` (180×180, mark on `#0B0A0F`), `app/favicon.ico` (32/16 generated from the solid mark).

## 3. Color tokens

Define as CSS variables, map in Tailwind v4 with `@theme inline`. Theme via `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`), Tailwind dark variant: `@custom-variant dark (&:where(.dark, .dark *));`.

| Token | Dark ("night shift") | Light ("day shift") | Use |
|---|---|---|---|
| `--bg` | `#0B0A0F` | `#F6F4F0` | page |
| `--bg-raised` | `#121019` | `#FFFFFF` | cards, sidebar |
| `--surface` | `#18151F` | `#EFECE6` | inputs, hover rows, code |
| `--line` | `#262130` | `#E2DDD5` | hairlines (1 px) |
| `--line-strong` | `#3A3346` | `#CBC4B8` | focused borders, dividers |
| `--fg` | `#F3F0F7` | `#17141D` | primary text |
| `--fg-muted` | `#A8A0B6` | `#5A5363` | secondary text (AA on bg) |
| `--fg-subtle` | `#847C93` | `#6E6777` | labels, meta (AA on bg) |
| `--accent` | `#B57BFF` | `#6D28D9` | links, focus ring, active nav |
| `--accent-solid` | `#7C3AED` | `#7C3AED` | primary buttons (white text, 5.7:1) |
| `--accent-fg` | `#FFFFFF` | `#FFFFFF` | text on accent-solid |
| `--ember` | `#F0ABFC` | `#C026D3` | hot highlights (live dot core, matched lines) |
| `--ok` | `#3DDC97` | `#0B7A4C` | verified, healthy |
| `--warn` | `#F5B841` | `#9A5B00` | awaiting approval, warnings |
| `--danger` | `#FF5D73` | `#C21F3A` | failed, critical |
| `--info` | `#7CA7FF` | `#2E58C9` | executing, neutral live |

Fire palette (ASCII fire, mark, terrain) — 37 steps interpolated through these stops:
- Dark theme: `transparent → #1E0B3A → #3B0F6B → #6D28D9 → #A855F7 → #D946EF → #F0ABFC → #FFE9FB`
- Light theme: `transparent → #E9DDFB → #C4B5FD → #8B5CF6 → #7C3AED → #A21CAF → #C026D3 → #4C1D95` (darker heat reads better on paper)

Status semantics (use the same everywhere — UI, widgets, OG image):
`open/triaged` → fg-muted · `awaiting_approval` → warn · `mitigating/executing/verifying` → info (pulsing dot) · `resolved/verified` → ok · `mitigation_failed/failed` → danger · `dismissed/expired/cancelled/rejected` → fg-subtle.

Contrast: every text token above meets WCAG AA (4.5:1) on `--bg` and `--bg-raised` of its theme. Verify with the Lighthouse a11y audit; do not introduce new text colors.

## 4. Typography

| Role | Font | Loading | Settings |
|---|---|---|---|
| Display (hero, section titles) | **Mona Sans** (variable `wdth` 75–125, `wght` 200–900) | `next/font/google` `Mona_Sans({ subsets:["latin"], axes:["wdth"], display:"swap", variable:"--font-display" })` | `font-variation-settings: "wdth" 118; font-weight: 760; letter-spacing: -0.045em; line-height: .9` |
| UI + body | **Geist** | `geist` package (`GeistSans`) → `--font-sans` | 400/500/600; body 16 px / 1.6 |
| Labels, ASCII, numbers in marketing | **Departure Mono** (OFL, not on Google Fonts) | `next/font/local` from `public/fonts/DepartureMono-Regular.woff2` → `--font-pixel` | Use at **11, 22, 33 px** (designed for 11 px increments); uppercase labels, `letter-spacing: .04em` |
| Code, diffs, SHAs, data tables | **Geist Mono** | `geist` (`GeistMono`) → `--font-mono` — **load only in the `/app` layout** | 13 px, `font-variant-numeric: tabular-nums` |

Download Departure Mono v1.500 from the official release (https://github.com/rektdeckard/departure-mono/releases) — copy the `.woff2` into `apps/web/public/fonts/` and the `.otf` into `apps/web/src/assets/` (for the OG image, which can't use woff2).

Type scale (fluid):
| Token | Size | Line | Tracking | Font |
|---|---|---|---|---|
| `display-1` | `clamp(3.25rem, 1.6rem + 7vw, 8.5rem)` | 0.9 | −0.045em | display |
| `display-2` | `clamp(2.25rem, 1.3rem + 4vw, 5rem)` | 0.95 | −0.035em | display |
| `title` | `clamp(1.5rem, 1.2rem + 1vw, 2rem)` | 1.15 | −0.02em | display, wdth 100, 650 |
| `body-lg` | 1.125rem | 1.55 | −0.005em | sans |
| `body` | 1rem | 1.6 | 0 | sans |
| `small` | 0.875rem | 1.5 | 0 | sans |
| `label` | 11px | 1.2 | 0.04em, uppercase | pixel |
| `mono` | 13px | 1.55 | 0 | mono |

Rules: max 2 display sizes per page; body measure 60–72ch; labels are formatted like `[01] DETECT` or `INC-12`; numbers use tabular figures; never letter-space lowercase body text.

## 5. Layout, spacing, shape

- Grid: 12 columns, max width **1280 px**, side gutter **16 px** mobile / **32 px** ≥ 768 / **48 px** ≥ 1280, column gap 24 px.
- Spacing scale (4-pt): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192. Marketing sections: `py-24 md:py-32 lg:py-48`.
- Radius: **6 px** controls, **10 px** cards, **999 px** pills. No larger radii.
- Depth: `--line` hairlines + `--bg-raised`; one shadow token for popovers only: `0 8px 30px -12px rgb(0 0 0 / .5)` (dark) / `rgb(23 20 29 / .18)` (light).
- Marketing background detail: a faint **12-column hairline grid** (1 px `--line` at 40% opacity) visible only in the hero and the final CTA — the "control room" texture.
- Focus: `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible` everywhere. Never remove outlines.
- Breakpoints: Tailwind defaults (`sm 640`, `md 768`, `lg 1024`, `xl 1280`). Design mobile-first; test at 360, 390, 768, 1024, 1440, 1920.

## 6. Motion system

Libraries and their single job (do not overlap):

| Library | Version | Job |
|---|---|---|
| **Lenis** (`lenis`, `lenis/react`) | 1.3 | Smooth scroll — **marketing layout only** (never in `/app`) |
| **GSAP** + `@gsap/react` (`useGSAP`) | gsap 3.15 (all plugins free) | ScrollTrigger pinning/scrubbing, SplitText headline reveals |
| **Motion** (`motion/react`) | 14 | Component enter/exit, layout transitions (status pills, probe squares), hover/press, `AnimatePresence` |
| **three** + `@react-three/fiber` + `@react-three/postprocessing` (`ASCII`) | 0.186 / 9.8 / 3.2 | One lazy-loaded "terrain" scene on the home page |
| Canvas 2D (own code) | — | ASCII fire (hero, loader, login) |

Do **not** add Locomotive Scroll: v5 is built on Lenis, so using both is redundant.

Lenis ↔ GSAP sync (marketing layout client component):
```tsx
"use client";
import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap"; import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const update = (t: number) => lenisRef.current?.lenis?.raf(t * 1000);
    gsap.ticker.add(update); gsap.ticker.lagSmoothing(0);
    lenisRef.current?.lenis?.on("scroll", ScrollTrigger.update);
    return () => gsap.ticker.remove(update);
  }, []);
  return <ReactLenis root options={{ autoRaf: false, lerp: 0.1 }} ref={lenisRef}>{children}</ReactLenis>;
}
```
(Import `lenis/dist/lenis.css` once in the marketing layout.)

Tokens:
| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | entrances, reveals |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | moves, page transitions |
| `--dur-1` | 120 ms | hover/press |
| `--dur-2` | 200 ms | small UI |
| `--dur-3` | 360 ms | cards, dialogs |
| `--dur-4` | 700 ms | section reveals, loader exit |
| stagger | 40 ms | lists, split text |

Principles:
1. Motion explains state change (alert arrives → suspects appear → action moves → probes fill). Decorative motion only in marketing.
2. Animate `transform` and `opacity` only. No animating `height` (use Motion `layout`) or `filter: blur` on large areas.
3. Press feedback: `scale: 0.98` over 120 ms on buttons. Hover lifts are **color/line changes**, not scale.
4. Live states: a 6 px dot with a 1.6 s opacity pulse (`--info` or `--warn`). That's the only infinite animation in `/app`.
5. `prefers-reduced-motion: reduce` → Lenis off, no pinning (sections stack), SplitText off (text visible), ASCII fire renders one static frame, terrain shows its poster image, Motion uses `transition={{ duration: 0 }}` via `MotionConfig reducedMotion="user"`.

## 7. Signature components

### 7.1 `<AsciiFire />` — `components/brand/ascii-fire.tsx` (client)
Props: `{ className?, intensity?: number = 1, interactive?: boolean, gapWidth?: number = 3, theme?: "dark"|"light" (auto from next-themes), fps?: number = 30, staticFrame?: boolean }`.
Algorithm (Doom PSX fire, Fabien Sanglard):
1. Grid `cols = floor(width / cellW)`, `rows = floor(height / cellH)` with `cellW = 9`, `cellH = 14` (desktop) / `cellW = 8`, `cellH = 12` (mobile). Buffer `Uint8Array(cols*rows)` of heat 0–36. Bottom row = 36 × intensity.
2. Each tick, for every x and y from 1 to rows−1, `spreadFire(y*cols + x)`:
   ```js
   const p = heat[src];
   if (p === 0) heat[src - cols] = 0;
   else {
     const r = (Math.random() * 3.0 + 0.5) | 0;             // 0..3
     const dst = src - r + 1 - cols;                          // up one row, wind shifts −2..+1 columns
     if (dst >= 0 && dst < heat.length) heat[dst] = Math.max(0, p - (r & 1));
   }
   ```
   Wrap-around at row edges is visually fine (classic behaviour); only guard array bounds.
3. **The firebreak:** if `interactive`, keep `breakCol` (follows pointer x on desktop, eased 0.15 per frame; on touch devices it drifts slowly ±12 cols around center). Any write whose destination column is within `[breakCol - gapWidth/2, breakCol + gapWidth/2]` writes **0** → fire visibly cannot cross the gap.
4. Render: char ramp `" .:-=+*#%@"`; char = `ramp[floor(h/36*(ramp.length-1))]`; color = palette[h] (37 steps, §3). **Pre-render a glyph atlas** (10 chars × 37 colors) on an `OffscreenCanvas`/hidden canvas once per theme; each frame clears and `drawImage`s cells with `h > 0`. Font for atlas: Departure Mono at `cellH` px (wait for `document.fonts.load('14px "Departure Mono"')` before building the atlas; fall back to monospace).
5. Performance: cap DPR at 2; throttle to `fps`; pause on `document.hidden` and when out of view (IntersectionObserver, threshold 0); no work when `staticFrame` (run 80 ticks synchronously, draw once). Target < 2 ms/frame on a mid laptop.
6. A11y: `<canvas aria-hidden="true">`; never carries information.

### 7.2 `<Loader />` — first-visit welcome screen (marketing only)
- Shown only on the **first visit** (localStorage `fb:welcomed`). An inline script in `<head>` (before paint) adds `class="fb-seen"` to `<html>` when the flag exists; CSS `.fb-seen .fb-loader { display: none }` → zero flash for returning visitors. Also hidden when `prefers-reduced-motion`.
- Layout: full-screen `--bg`; centered a 28×12-cell `<AsciiFire intensity={0→1 ramp}/>` igniting from the bottom; under it the wordmark `firebreak` (server-rendered text, then a React Bits **DecryptedText** reveal); a mono line `WELCOME — CLEARING A PATH` and a 3-digit percentage `000 → 100`.
- Progress = real readiness: 40% `document.fonts.ready`, 30% hero canvas first frame (event from `AsciiFire`), 30% `window` `load`. Minimum 900 ms, maximum 2 000 ms (then exits regardless).
- Exit: the screen **splits along a vertical gap** — left and right halves translate apart (`--dur-4`, `--ease-out`) — revealing the page (the firebreak opening). Then set `fb:welcomed=1` and unmount.
- `Esc`/"Skip" button (visible, focusable). Overlay has `role="status"` + `aria-live="polite"` with "Loading Firebreak".
- Must not hurt LCP/CLS: the overlay is `position: fixed`; the page beneath is fully server-rendered; no layout shift on exit.

### 7.3 `<TerrainScene />` — three.js "the break" (home page interlude, lazy)
- R3F `<Canvas dpr={[1, 1.5]} frameloop={inView ? "always" : "never"}>`, a `PlaneGeometry(10, 10, 160, 160)` displaced by 2D simplex noise (heightmap), orthographic-ish camera at 35° looking across.
- Custom shader material: uniform `uFront` (0→1, scroll-driven via ScrollTrigger `scrub`) moves a burn front from left to right; vertices left of the front glow with the fire palette by height; a **vertical strip** at `x ∈ [0.55, 0.62]` is the break: rendered as flat dark (`--bg`), and the front **stops** at its left edge; the right side stays cool lilac `#3A3346`.
- Post-processing: `<EffectComposer><ASCII characters=" .:-+*=%@#" fontSize={36} cellSize={10} color="#B57BFF" invert={false} /></EffectComposer>` (`@react-three/postprocessing`).
- Loading: `dynamic(() => import("./terrain-scene"), { ssr: false })` **inside a client wrapper** (Next: `ssr:false` is not allowed in Server Components) and only mounted when the section is within 600 px of the viewport. Fallback/poster: a static AVIF (`public/images/terrain-poster.avif`, rendered once from the scene) shown while loading, for reduced motion, for `navigator.connection?.saveData`, and when `hardwareConcurrency <= 4`.
- Budget: the scene's JS chunk must not appear in the initial home-page bundle (check `next build` output).

### 7.4 Other signature pieces
- **`<StatusPill status>`**: pill with 6 px dot + label (pixel font, uppercase). Uses semantics from §3. Changes animate with Motion `layout` + crossfade.
- **`<LoopRail steps current>`**: 6 steps `DETECT · TRACE · PROPOSE · APPROVE · EXECUTE · VERIFY`, connected by a 1 px line that fills (`scaleX`) with `--accent` as steps complete; current step dot pulses.
- **`<ProbeStrip probes max=18>`**: 18 squares (10 px, 2 px gap); grey (pending), `--ok` (healthy), `--danger` (failed); each new probe pops in (`scale 0.6→1`, 200 ms). Above it a tiny latency sparkline (shadcn chart / Recharts, no axes).
- **`<SuspectRow>`**: rank in pixel font, short SHA in mono (link), message, points bar (`--accent` fill, width = score), evidence chips (`file`, `fn`, `line`, `token`, `risk`, `recent`) — chips use lucide `FileCode2`, `FunctionSquare`, `Hash`, `Quote`, `TriangleAlert`, `Clock3`.
- **`<HoldToConfirm>`** (approve button): press-and-hold 800 ms fills the button left→right; release early cancels; also activates on `Enter`/`Space` press-and-hold; plus an accessible **"Confirm" fallback** in the dialog for assistive tech (`aria-describedby` explains hold).
- **`<DiffBlock>`**: mono diff with line numbers; lines matching evidence get an `--ember` left border and a subtle tint; header shows file path + "matched stack frame #1".

## 8. Component sources (use these; don't hand-roll what exists)

Base: **shadcn/ui** (`npx shadcn@latest init`; then add): `button`, `input`, `label`, `textarea`, `select`, `checkbox`, `switch`, `dialog`, `alert-dialog`, `sheet`, `dropdown-menu`, `tooltip`, `tabs`, `badge`, `separator`, `skeleton`, `scroll-area`, `accordion`, `command` (cmdk), `sonner`, `sidebar`, `chart`, `breadcrumb`, `avatar`, `table`, `form` (react-hook-form + zod).

From registries (install with the shadcn CLI; restyle to tokens after install):

| Need | Source | Install |
|---|---|---|
| Loader wordmark + section label reveal | React Bits `DecryptedText` | `npx shadcn@latest add https://reactbits.dev/r/DecryptedText-TS-TW` |
| 404 page glyph art | React Bits `ASCIIText` | `npx shadcn@latest add https://reactbits.dev/r/ASCIIText-TS-TW` |
| Status text change ("verifying" → "verified") | motion-primitives `text-scramble` | `npx motion-primitives@latest add text-scramble` |
| Approval expiry countdown, stat numbers | Animate UI sliding number | `npx shadcn@latest add @animate-ui/primitives-texts-sliding-number` |
| MCP diagram connectors (clients → MCP → core) | Magic UI `animated-beam` | `npx shadcn@latest add @magicui/animated-beam` |
| Section/list fade-ins in `/app` | Magic UI `blur-fade` | `npx shadcn@latest add @magicui/blur-fade` |
| Theme toggle with view transition | Magic UI `animated-theme-toggler` | `npx shadcn@latest add @magicui/animated-theme-toggler` |
| Safety "bento" layout | Magic UI `bento-grid` | `npx shadcn@latest add @magicui/bento-grid` |
| Password/API-key input with reveal + copy | coss/Origin UI input patterns (https://coss.com/origin) | copy the component code (registry command unverified) |
| Header progressive blur on scroll | motion-primitives `progressive-blur` | `npx motion-primitives@latest add progressive-blur` |

Rules: after installing any registry component, (1) replace its colors with tokens, (2) remove any sparkle/glow defaults, (3) check it respects reduced motion, (4) check its bundle size. If a component fights the design, drop it.

Icons: **lucide-react** only (1.5 px stroke `strokeWidth={1.5}`, size 16/20). Brand marks of third parties (GitHub, Vercel, Claude, Cursor) are rendered as **text** in the pixel font, not logos.

## 9. Design-engineering skills for the builder AI

Install before building the frontend (skills.sh / skill-issue.in; `npx skills add …`):

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills@latest add emilkowalski/skills            # emil-design-eng (motion + design-engineering taste)
npx skills add greensock/gsap-skills --skill gsap-react
npx skills add jakubkrehel/make-interfaces-feel-better
npx skills add yetone/kill-ai-slop
npx skills add addyosmani/web-quality-skills          # Lighthouse / Core Web Vitals
```
These skills are **advisors**. When a skill conflicts with this doc, this doc wins (log it in `CONTEXT.md`).

Reference sensibility (study, don't copy): Linear (density, restraint), Vercel (type + grids), Rauno Freiberg's and Emil Kowalski's interaction craft, Teenage Engineering (labels, mono), Awwwards "Sites of the Day" with ASCII/terminal aesthetics.
