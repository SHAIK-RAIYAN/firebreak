# 05 — NitroStack MCP Server (`apps/mcp`) + NitroStudio

> Firebreak's MCP server exposes the same core loop to MCP clients: NitroStudio, Claude Code, Cursor, Claude.
> Built with **NitroStack 1.1** (`@nitrostack/core`, `@nitrostack/cli`, `@nitrostack/widgets`).
> Facts here were verified by reading the published 1.1.2 packages (2026-10-17). Where NitroStack's docs and its code disagree, **this file follows the code**.

---

## 1. What the MCP server does (and does not)

| Does | Does not |
|---|---|
| List services and incidents, show an incident card (widget) | Run traces or AI analysis (that's the web app's Inngest pipeline) |
| Show ranked suspects with evidence (widget) | Execute rollbacks directly — execution always goes through the `action/approved` event and the same Inngest function |
| Propose a rollback (with preflight) and show its status/probes (widget) | Approve unless the key has the `actions:approve` scope (off by default) |
| Read the AI analysis and the timeline | Store anything except via `@firebreak/core` services |

Every tool = Zod parse → identity from guard → **one** `@firebreak/core` service call → compact JSON.

---

## 2. Scaffold (exact steps)

```bash
cd apps
npx @nitrostack/cli@1 init mcp --template typescript-starter --skip-install
cd mcp
```
Then:
1. In `apps/mcp/package.json`: set `"name": "@firebreak/mcp"`, add `"@firebreak/core": "workspace:*"` to dependencies, add `"@modelcontextprotocol/sdk"` and `"tsx"` to devDependencies (smoke test), add `"files": ["dist", "src/widgets/out"]`, add script `"smoke": "tsx scripts/smoke.ts"`. Keep the generated scripts (`dev`, `build`, `start`, `start:prod`, `widget`, `install:all`) unchanged.
2. From the repo root: `pnpm install`. (The widgets app in `apps/mcp/src/widgets` has its **own** `package.json` and is installed by `nitrostack-cli` with npm during `dev`/`build` — it is intentionally **not** a pnpm workspace package. `pnpm-workspace.yaml` globs `apps/*` only, so it is not picked up.)
3. Delete the calculator module (`src/modules/calculator/*`) and the `calculator-result` widget **after** you've read them once — they are the reference for decorator usage. Keep `src/health/system.health.ts`.
4. Keep the generated `tsconfig.json` (ES2022, `moduleResolution: node`, `experimentalDecorators`, `emitDecoratorMetadata`, excludes `src/widgets`). Local imports use `.js` suffixes.
5. Keep `src/index.ts` exactly as generated (it does `import 'dotenv/config'`, `McpApplicationFactory.create(AppModule)`, `server.start()`).

**Rule for the builder AI:** when unsure about a NitroStack API, open `node_modules/@nitrostack/core/dist/**/*.d.ts` and the scaffolded template files. Do not copy examples from NitroStack's website without checking the `.d.ts` — some doc examples are wrong (§10).

---

## 3. Layout

```
apps/mcp/
├── .env.example
├── Dockerfile
├── scripts/smoke.ts
└── src/
    ├── index.ts                      # generated, unchanged
    ├── app.module.ts                 # @McpApp + root @Module
    ├── auth/
    │   ├── identity.ts               # WeakMap identity store + identity(ctx) + requireScope()
    │   └── mcp-key.guard.ts          # McpKeyGuard (Injectable, deps: [KeyService])
    ├── shared/
    │   ├── key.service.ts            # wraps core.validateMcpKey (hash lookup)
    │   ├── core-ctx.ts               # identity → core service ctx (uses core mcpCtx)
    │   ├── rate-key.ts               # @RateLimit key (§4.5)
    │   ├── env.ts                    # Zod env validation (doc 13 §2.4)
    │   └── tool-error.ts             # AppError → safe tool error (runTool)
    ├── modules/
    │   ├── incidents/{incidents.module.ts, incidents.tools.ts, schemas.ts}
    │   ├── actions/{actions.module.ts, actions.tools.ts, schemas.ts}
    │   └── services/{services.module.ts, services.tools.ts, schemas.ts}
    ├── health/system.health.ts       # generated
    └── widgets/                      # Next.js 14 widget app (built to src/widgets/out/*.html)
        ├── package.json, next.config.js, tsconfig.json, widget-manifest.json
        ├── lib/{types.ts, theme.ts, format.ts}
        └── app/{layout.tsx, incident-card/page.tsx, suspect-list/page.tsx, action-status/page.tsx}
```

---

## 4. Authentication (custom guard — do not use `ApiKeyModule`)

### 4.1 Why custom
- `ApiKeyModule.validate()` returns `false` when no static keys are configured, before `customValidation` runs → a DB-backed check always denies (verified bug).
- NitroStack's `createContext` decodes any bearer token **without verifying a signature** and may set `ctx.auth = { authenticated: true, … }`. So `ctx.auth` is **never** trusted.

### 4.2 Key transport
- **HTTP:** `Authorization: Bearer fbk_…`. NitroStack copies request headers (lower-cased) into `ctx.metadata` on the modern protocol path and bridges `Authorization` on the legacy path, so read `ctx.metadata?.authorization`. (Do **not** use `X-API-Key`: it isn't in the CORS allow-list and isn't bridged on the legacy path.)
- **stdio (NitroStudio, local only):** no headers exist. The guard falls back to `process.env.FIREBREAK_MCP_KEY` **only when** `process.env.MCP_TRANSPORT_TYPE` is unset or `stdio` **and** `NODE_ENV !== "production"`. The key is still validated against the DB like any other.

### 4.3 `auth/identity.ts`
```ts
import type { ExecutionContext } from "@nitrostack/core";
export type Identity = { workspaceId: string; userId: string; keyId: string; scopes: string[] };
const verified = new WeakMap<object, Identity>();
export function setIdentity(ctx: ExecutionContext, id: Identity) { verified.set(ctx, id); }
export function identity(ctx: ExecutionContext): Identity {
  const id = verified.get(ctx);
  if (!id) throw new Error("UNAUTHENTICATED: missing or invalid Firebreak MCP key");
  return id;
}
export function requireScope(id: Identity, scope: "incidents:read" | "actions:propose" | "actions:approve") {
  if (!id.scopes.includes(scope)) throw new Error(`FORBIDDEN: this key lacks the '${scope}' permission`);
}
```
The WeakMap makes identity **unforgeable** and **fail-closed**: if a tool forgets `@UseGuards`, `identity(ctx)` throws.

**First thing to test in NitroStudio:** call a tool with a valid key. If `identity(ctx)` throws even though the guard logged success, NitroStack passed a *different* context object to the handler than to the guard. Fallback (record it in `CONTEXT.md` → Decisions): make `identity(ctx)` re-run `KeyService.validate(extractKey(ctx))` (60 s in-memory cache → effectively free) instead of reading the WeakMap. Never fall back to `ctx.auth`.

### 4.4 `auth/mcp-key.guard.ts`
```ts
import { Injectable, type ExecutionContext } from "@nitrostack/core";
import { KeyService } from "../shared/key.service.js";
import { setIdentity } from "./identity.js";

@Injectable({ deps: [KeyService] })
export class McpKeyGuard {
  constructor(private readonly keys: KeyService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const raw = this.extract(ctx);
    if (!raw) { ctx.logger.warn("mcp auth: no key"); return false; }
    const id = await this.keys.validate(raw);          // null if unknown/revoked
    if (!id) { ctx.logger.warn("mcp auth: invalid key", { prefix: raw.slice(0, 12) }); return false; }
    setIdentity(ctx, id);
    ctx.auth = { authenticated: true, subject: id.userId, scopes: id.scopes, clientId: id.keyId }; // for NitroStack internals (@RateLimit keying); never read by our code
    return true;
  }
  private extract(ctx: ExecutionContext): string | null {
    const h = ctx.metadata?.["authorization"];
    if (typeof h === "string" && h.startsWith("Bearer fbk_")) return h.slice(7).trim();
    const stdio = !process.env.MCP_TRANSPORT_TYPE || process.env.MCP_TRANSPORT_TYPE === "stdio";
    if (stdio && process.env.NODE_ENV !== "production") return process.env.FIREBREAK_MCP_KEY ?? null;
    return null;
  }
}
```
- Check the exact `Guard` interface name in `@nitrostack/core` `.d.ts` (`implements Guard` if exported) and the `ctx.auth` type; adjust the assignment to match the type. Record in `CONTEXT.md` §4.
- **Guards with constructor deps must be in a module's `providers`** (NitroStack only resolves guards from DI if registered; otherwise it calls `new Guard()` with no args → crash). Register `KeyService` and `McpKeyGuard` in every module's `providers` (or a shared module imported everywhere — verify DI scoping in Studio).
- `KeyService.validate(raw)` → `core.validateMcpKey(raw)`: sha256 → `mcp_api_keys` where `key_hash = $1 and revoked_at is null` → identity; update `last_used_at` only if older than 5 min (one cheap UPDATE). Cache positive results in memory for 60 s (Map keyed by hash) to keep tool calls fast; revocation takes effect within 60 s (documented in UI).

### 4.5 Rate limiting
`@RateLimit({ requests: 60, window: "1m", key: rateKey })` on every tool (in-memory, single instance — fine for MVP), where
```ts
// shared/rate-key.ts — does NOT depend on the guard having run (pipeline order of @RateLimit vs guards is unverified)
export const rateKey = (ctx: ExecutionContext) =>
  "mcp:" + createHash("sha256").update(String(ctx.metadata?.["authorization"] ?? "stdio")).digest("hex").slice(0, 16);
```
Each key gets its own bucket; unauthenticated floods share only the "no header" bucket and can't starve real keys. Note the signature is `{ requests, window }`, **not** `{ windowMs, maxRequests }` as some docs show.

---

## 5. `app.module.ts`

Mirror the scaffolded file's shape; only change modules/name/version:

```ts
import { McpApp, Module } from "@nitrostack/core";
import { IncidentsModule } from "./modules/incidents/incidents.module.js";
import { ActionsModule } from "./modules/actions/actions.module.js";
import { ServicesModule } from "./modules/services/services.module.js";
import { SystemHealth } from "./health/system.health.js";   // keep whatever the scaffold registered for health

@McpApp({
  module: AppModule,
  server: { name: "firebreak", version: "0.1.0" },
  logging: { level: (process.env.NITRO_LOG_LEVEL as any) ?? "info" },
})
@Module({
  name: "app",
  imports: [IncidentsModule, ActionsModule, ServicesModule],
  providers: [/* as scaffolded */],
})
export class AppModule {}
```
Do **not** hardcode `transport` in `@McpApp`; it is chosen by `MCP_TRANSPORT_TYPE` (env wins over decorator). Default when unset: `stdio` in development, `dual` in production → always set it explicitly in prod (`http`).

Each feature module:
```ts
@Module({ name: "incidents", controllers: [IncidentTools], providers: [KeyService, McpKeyGuard] })
export class IncidentsModule {}
```

---

## 6. Tools (9) — names, schemas, behaviour

All schemas use NitroStack's `z` (`import { z } from "@nitrostack/core"`) — **not** `zod@4` from core (02 §8 G3). Every handler begins with `const input = Schema.parse(raw)` because NitroStack does not validate at runtime (G4).

Decorator import (the plain `Tool` export is a class, not the decorator):
```ts
import { ToolDecorator as Tool, Widget, UseGuards, RateLimit, Injectable, z, type ExecutionContext } from "@nitrostack/core";
```

Handler template:
```ts
@Injectable({ deps: [] })
export class IncidentTools {
  @Tool({
    name: "get_incident",
    title: "Get incident",
    description: "Get one Firebreak incident with status, deployments, top suspects, the proposed action and recent timeline. Use after list_incidents. Accepts the incident id (inc_…) or its number (e.g. 12 for INC-12).",
    inputSchema: GetIncidentInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
    invocation: { invoking: "Reading incident…", invoked: "Incident loaded" },
  })
  @Widget("incident-card")
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async getIncident(raw: unknown, ctx: ExecutionContext) {
    const input = GetIncidentInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "incidents:read");
    return runTool(ctx, () => core.getIncidentCard(coreCtx(id), input));
  }
}
```
`runTool` catches `AppError` → throws `new Error(`${code}: ${safeMessage}`)` (no stack, no secrets); unknown errors → `INTERNAL: Something went wrong (request <ctx.requestId>)` and logs the real error. Check in NitroStudio how a thrown error is rendered (should be an MCP tool error with `isError: true`) and record it in `CONTEXT.md`.

| # | Tool | Input | Scope | Widget | Annotations | Returns (compact) |
|---|---|---|---|---|---|---|
| 1 | `list_services` | `{}` | incidents:read | — | readOnly | `[{ id, name, repo, vercelProject, healthUrl, activeIncident: {id, number, status} \| null }]` |
| 2 | `list_incidents` | `{ status?: "active"\|"resolved"\|"all" = "active", serviceId?: string, limit?: 1..20 = 10 }` | incidents:read | — | readOnly | `[{ id, number, title, service, status, severity, openedAt, topSuspect: {shortSha, message} \| null }]` |
| 3 | `get_incident` | `{ incident: string }` (id `inc_…` or number) | incidents:read | `incident-card` | readOnly | `IncidentCard` (doc 06 §5.7) |
| 4 | `get_suspects` | `{ incident: string, limit?: 1..10 = 5 }` | incidents:read | `suspect-list` | readOnly | `{ incident: {id, number, title}, deployments: {bad, good}, confidence, suspects: [{ rank, shortSha, message, author, points, score, url, evidence: [{kind, label}] , files: [{path, matched}] }] }` |
| 5 | `get_analysis` | `{ incident: string }` | incidents:read | — | readOnly | `{ status, provider, model, summary, likelyCause, confidence, fixSuggestions, unknowns }` or `{ status: "skipped", reason }` |
| 6 | `get_timeline` | `{ incident: string, limit?: 1..50 = 20 }` | incidents:read | — | readOnly | `[{ at, type, actor, summary }]` newest last |
| 7 | `propose_rollback` | `{ incident: string }` | actions:propose | `action-status` | `{ readOnlyHint: false, destructiveHint: false, idempotentHint: true }` | `ActionStatus` incl. `approveUrl` |
| 8 | `get_action_status` | `{ action?: string, incident?: string }` (one required) | incidents:read | `action-status` | readOnly | `ActionStatus` |
| 9 | `approve_action` | `{ action: string, note?: string ≤ 200 }` | **actions:approve** | `action-status` | `{ destructiveHint: true, idempotentHint: false }` | `ActionStatus` (status `approved`, execution starting) |

Exact descriptions (the model reads these — keep them):
- `list_services`: "List the services Firebreak protects (GitHub repo + Vercel project + health URL) and whether each has an active incident."
- `list_incidents`: "List Firebreak incidents. Defaults to active ones. Use this first when the user asks what is broken, on fire, or failing."
- `get_incident`: (above)
- `get_suspects`: "Show the commits most likely to have caused an incident, ranked by a deterministic score with evidence (files and functions that match the error). Use when the user asks what broke or which commit caused it."
- `get_analysis`: "Get the AI-written explanation and fix suggestions for an incident, if available. This is advisory; suspects and actions are computed without AI."
- `get_timeline`: "Get the ordered audit trail of an incident: alerts, ranking, proposals, approvals, rollback, health checks."
- `propose_rollback`: "Propose rolling production back to the last good deployment for an incident. Runs safety checks. Does NOT change production: a human must approve in Firebreak (approveUrl). Safe to call twice; returns the existing proposal."
- `get_action_status`: "Get the status of a rollback: awaiting approval, executing, verifying with live health checks, verified, or failed. Call repeatedly to follow progress."
- `approve_action`: "Approve a proposed rollback so Firebreak executes it on Vercel and verifies recovery. This changes production. Only call when the user has explicitly said to approve this specific action. Requires a key with the 'Approve rollbacks' permission."

`approveUrl` = `${FIREBREAK_APP_URL}/app/incidents/${incidentId}?action=${actionId}`.
`ActionStatus`, `IncidentCard` and the other payloads are defined once in **doc 06 §5.7** (`packages/core/src/views/types.ts`). Tools return them unchanged (compact JSON).

---

## 7. Widgets (3) — `apps/mcp/src/widgets`

Facts: separate **Next.js 14 / React 18** app (own `package.json`), one folder per widget `app/<name>/page.tsx` starting with `'use client'`, wrapped by `app/layout.tsx` (`<WidgetLayout>` as scaffolded). Linked to a tool by `@Widget("<name>")`. Built by `nitrostack-cli build` into **single inline HTML files** at `src/widgets/out/<name>.html`, served as `ui://widget/<name>.html`. `NITROSTACK_APP_MODE=universal` makes them work for MCP Apps clients, the OpenAI Apps SDK and NitroStudio.

Data access:
```tsx
'use client';
import { useWidgetSDK, useTheme } from "@nitrostack/widgets";
import type { IncidentCard } from "../../lib/types";
export default function Page() {
  const { getToolOutput, openExternal, callTool } = useWidgetSDK();
  const theme = useTheme();                      // 'light' | 'dark' (verify return type in .d.ts)
  const data = getToolOutput<IncidentCard>();
  if (!data) return <Skeleton />;
  …
}
```

Design rules for widgets (they are part of the brand):
- **Inline styles only** (Tailwind classes may not apply inside client iframes). Tokens in `lib/theme.ts` copied from doc 08 §3 (dark + light), chosen by `useTheme()`.
- Fonts: system stacks only (`ui-sans-serif, system-ui` / `ui-monospace, SFMono-Regular, Menlo, monospace`); no web fonts (CSP).
- No external network calls. Links use `openExternal(url)` (GitHub commit URLs, `approveUrl`).
- Max height ~420 px; compact; no animations except a 150 ms fade-in and a pulsing 6 px status dot for live states (`prefers-reduced-motion` respected).
- `widget-manifest.json`: include one example payload per widget (copy from `packages/fixtures`), so NitroStudio previews work without a live DB.

| Widget | Shows | Interactions |
|---|---|---|
| `incident-card` | `INC-12` mono label, title, status pill, service, opened-ago, bad→good deployment row (short SHAs), top suspect line, live action status line | "Open in Firebreak" (`openExternal`), "Show suspects" (`callTool("get_suspects", {incident})`) |
| `suspect-list` | Ranked rows: rank, short SHA, message, points bar (width = score), evidence chips (kind icon + label), matched files in mono | Row click → `openExternal(commit url)` |
| `action-status` | Step rail: Proposed → Approved → Executing → Verifying → Verified/Failed; preflight checklist (✓/✕/!); probe strip (18 small squares filled green/red/grey as probes arrive); expiry countdown when awaiting approval | "Approve in Firebreak" (`openExternal(approveUrl)`), "Refresh" (`callTool("get_action_status", {action})`) |

Icons: inline SVG, 1.5 px stroke, no emoji, no sparkles/robot/brain glyphs.

Payload types come from `@firebreak/core` (doc 06 §5.7) on the server side. The widget app is a separate build that can't import workspace packages, so copy the needed types into `src/widgets/lib/types.ts` with the header comment "Copied from packages/core/src/views/types.ts — keep in sync."

---

## 8. Environment (`apps/mcp/.env.example`)

```dotenv
NODE_ENV=development
MCP_TRANSPORT_TYPE=stdio          # stdio for NitroStudio; http for remote; prod: http
PORT=3005                         # prod: whatever the host provides (Northflank sets PORT) — default 3000
HOST=localhost                    # prod/container: 0.0.0.0  (NitroStack default is localhost!)
ENABLE_CORS=true
NITRO_LOG_LEVEL=info
NITROSTACK_APP_MODE=universal
DATABASE_URL=postgres://…         # same DB as web (Neon dev branch locally)
ENCRYPTION_KEY=…                  # same as web (needed to decrypt the Vercel token for preflight)
INNGEST_EVENT_KEY=…               # to send action/proposed and action/approved (prod); local dev server needs none
INNGEST_DEV=1                     # local only: send events to the Inngest Dev Server
FIREBREAK_APP_URL=http://localhost:3000
FIREBREAK_MCP_KEY=fbk_…           # stdio/dev only — create one in /app/settings/mcp
```

Logging: in stdio mode **nothing may write to stdout** except the MCP protocol. `@firebreak/core`'s pino logger writes to **stderr** (fd 2) always.

---

## 9. NitroStudio workflow (development + demo)

1. Download NitroStudio **1.4.20** for your OS from https://nitrostack.ai/studio (releases on `github.com/nitrocloudofficial/studio-releases`).
2. `pnpm --filter @firebreak/core build` (the MCP app imports `dist/`). Keep `pnpm --filter @firebreak/core dev` running for watch builds.
3. Create an MCP key in the local web app (`/app/settings/mcp`) → put it in `apps/mcp/.env` as `FIREBREAK_MCP_KEY`, with `MCP_TRANSPORT_TYPE=stdio`.
4. In NitroStudio: **open the `apps/mcp` folder**. Studio starts the server over stdio and the widget dev server on **3001**.
5. Use the **tool runner** (forms are generated from the Zod schemas) to call every tool. Check each widget renders in **widget preview**, in dark and light.
6. Use **Logs** to confirm guard behaviour (remove the key → every tool returns UNAUTHENTICATED).
7. Use **Chat** (Studio supports OpenAI or Gemini — enter your own key in Studio) for the demo conversation:
   - "What's on fire right now?" → `list_incidents` → `get_incident` (incident-card)
   - "Which commit caused it?" → `get_suspects` (suspect-list)
   - "Explain it and how to fix it." → `get_analysis`
   - "Roll it back." → `propose_rollback` (action-status with Approve link) → approve in the web app
   - "Did it work?" → `get_action_status` (probe strip fills green)
8. Remote HTTP in Studio is not documented — test the deployed server with the smoke script (§11) and with Claude Code / Cursor (doc 12).

---

## 10. NitroStack gotchas checklist (verified in 1.1.2)

- [ ] Import `ToolDecorator as Tool` (and `ResourceDecorator`, `PromptDecorator` if used). `Tool` itself is a class.
- [ ] Use `@Injectable({ deps: [A, B] })` with explicit deps (ESM-safe DI).
- [ ] Guards with constructor deps are listed in `providers`.
- [ ] `Schema.parse(raw)` at the top of every handler.
- [ ] There is **no** `ctx.input`; use the handler's first argument.
- [ ] Never trust `ctx.auth`; use `identity(ctx)`.
- [ ] `@RateLimit({ requests, window: "1m" })` — not `windowMs`.
- [ ] Don't use `@Cache` (keys ignore identity).
- [ ] `McpApplicationFactory.create(AppModule)` takes one argument.
- [ ] Prod env: `MCP_TRANSPORT_TYPE=http`, `HOST=0.0.0.0`, health `GET /mcp/health`, endpoint `/mcp`.
- [ ] Docker image contains `src/widgets/out` and runs from the project root (`WORKDIR` = app root).
- [ ] No `console.log` to stdout in stdio mode.

---

## 11. Smoke test — `apps/mcp/scripts/smoke.ts`

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = new URL(process.env.MCP_URL ?? "http://localhost:3005/mcp");
const key = process.env.FIREBREAK_MCP_KEY!;
const transport = new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${key}` } } });
const client = new Client({ name: "firebreak-smoke", version: "1.0.0" });
await client.connect(transport);
const { tools } = await client.listTools();
const expected = ["list_services","list_incidents","get_incident","get_suspects","get_analysis","get_timeline","propose_rollback","get_action_status","approve_action"];
for (const n of expected) if (!tools.some(t => t.name === n)) throw new Error(`missing tool ${n}`);
const r = await client.callTool({ name: "list_incidents", arguments: { status: "all", limit: 3 } });
if (r.isError) throw new Error("list_incidents failed: " + JSON.stringify(r.content));
console.log("OK", tools.length, "tools");
await client.close();

// Negative: the same call without a key must fail.
const anon = new Client({ name: "firebreak-smoke-anon", version: "1.0.0" });
await anon.connect(new StreamableHTTPClientTransport(url));
let refused = false;
try { const r2 = await anon.callTool({ name: "list_incidents", arguments: {} }); refused = Boolean(r2.isError); }
catch { refused = true; }
await anon.close();
if (!refused) throw new Error("SECURITY: list_incidents succeeded without a key");
console.log("OK auth enforced");
```
Run: `MCP_URL=… FIREBREAK_MCP_KEY=… pnpm --filter @firebreak/mcp smoke`. Must pass locally (http mode) and against production.

---

## 12. Docker + deploy (`apps/mcp/Dockerfile`, build context = repo root)

```dockerfile
# ---- build ----
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @firebreak/core build
WORKDIR /repo/apps/mcp
# nitrostack-cli build: installs widget deps (npm), bundles widgets → src/widgets/out/*.html, tsc → dist/
RUN pnpm run build
WORKDIR /repo
# Self-contained copy of @firebreak/mcp with prod deps (incl. the built workspace package)
RUN pnpm --filter @firebreak/mcp deploy --prod --legacy /out

# ---- runtime ----
FROM node:22-alpine
WORKDIR /app
COPY --from=build /out ./
ENV NODE_ENV=production MCP_TRANSPORT_TYPE=http HOST=0.0.0.0 PORT=3000 NITROSTACK_APP_MODE=universal
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:${PORT}/mcp/health || exit 1
USER node
CMD ["node", "dist/index.js"]
```
- `"files": ["dist", "src/widgets/out"]` in `apps/mcp/package.json` makes `pnpm deploy` include the built widgets. Verify after build: `docker run --rm firebreak-mcp ls src/widgets/out` lists 3 `.html` files.
- If `pnpm deploy --legacy` is rejected by your pnpm version, use `pnpm deploy --prod` with `inject-workspace-packages=true` in `.npmrc`, and record the choice in `CONTEXT.md`.
- Local check: `docker build -f apps/mcp/Dockerfile -t firebreak-mcp . && docker run --env-file apps/mcp/.env.docker -p 3005:3000 firebreak-mcp` → `curl localhost:3005/mcp/health` → smoke test.
- Host: **Northflank** (free, always-on). Create a "combined service" from the GitHub repo, Dockerfile path `apps/mcp/Dockerfile`, build context `/`, port 3000 (HTTP, public), env vars from §8 (prod values), health check path `/mcp/health`. **1 instance only** (in-memory sessions + rate limits).
- Public URL becomes `https://<service>.code.run/mcp` (whatever Northflank assigns) → set as `NEXT_PUBLIC_MCP_URL` in web so the settings page shows it.
