# 14 — Testing Strategy and Final Acceptance

> "Done" = §3 passes on the **deployed** URLs + every box in §4 is ticked. Not before.

---

## 1. Test layers

| Layer | Tool | What | Runs |
|---|---|---|---|
| Pure domain | Vitest | ranking, state machines, preflight, fingerprint, AI sanitizer, bundle builder (escaping + truncation), error mapping | every commit (CI) |
| Crypto | Vitest | seal/open (5 cases), HMAC alert + GitHub signature, state tokens, MCP key hash | CI |
| Adapters | Vitest + **msw** | Vercel (current-production 3 branches, rollback-target selection, error mapping, alias-job polling), GitHub (compare reversal/truncation, files), probe (sha extraction, timeout) | CI |
| Services (DB) | Vitest + Neon test branch (`DATABASE_URL_TEST`) | ingestAlert (new/dedupe/race/replay), propose/approve/reject/expire CAS, double-approve → one transition, workspace isolation | locally + CI if secret present |
| API routes | Vitest calling route handlers with `NextRequest` | envelope, 401/404/409/412/422, Origin check, alerts signature | CI |
| MCP | `apps/mcp/scripts/smoke.ts` (real HTTP client) + NitroStudio manual pass | tool list, auth required, list_incidents works, scopes enforced | locally + against prod |
| UI smoke | Playwright | home renders (no console errors), login page, `/app` redirects when signed out, theme toggle, reduced-motion snapshot | CI (headless) |
| AI prompt | `pnpm test:ai` (manual, needs a key) | 3 regression bundles (doc 07 §7.1) | before release |
| Perf/a11y | Lighthouse + axe (doc 10 §7) | scores | before release |

Coverage goal: `packages/core/src/domain/**` and `crypto/**` ≥ 90% lines. Don't chase coverage elsewhere.

## 2. Must-have test cases (write these exact tests)

1. `ranking`: the 7 cases in doc 03 §6.5.
2. `state`: every allowed transition in doc 06 §3.1 and §3.2 tables passes; 5 representative invalid ones throw (`resolved → verifying`, `awaiting_approval → verified`, `rejected → approved`, `verified → executing`, `dismissed → open`).
3. `preflight`: each blocking check failing alone blocks; `still_failing=false` alone does not block.
4. `hmac`: valid; wrong secret; ts 301 s old; ts 301 s in future; header without `v1=`; hex of wrong length; body modified by 1 byte.
5. `ingestAlert`: new incident; same fingerprint → attach (alert_count 2, no new event); same `id` → 200 deduped; resolved incident + same fingerprint → **new** incident; concurrent double insert → one incident (simulate with two parallel calls).
6. `approveAction`: approve twice in parallel → exactly one success, one `CONFLICT`; approve after expiry → `PRECONDITION_FAILED ACTION_EXPIRED`; MCP approve without scope → `FORBIDDEN`.
7. `executeAction`: re-run after `vercel_response` set → no second rollback call (msw call count = 1); drift → `cancelled`.
8. `recordProbe`: same seq twice → one row; streak computation; sha mismatch → not ok.
9. `sanitize`: unknown suspect id → null + low; unknown evidence ids dropped; high confidence on non-top suspect → medium.
10. `bundle`: commit message containing `</untrusted_diff>` is escaped; `ghp_…` in a diff is redacted.
11. Isolation: workspace B cannot read workspace A's incident/service/action by id (repo returns null; route returns 404).

## 3. End-to-end acceptance script (run on production)

Pre: demo app healthy; a Service exists for it; `packages/fixtures/.env` → prod; an MCP key (read + propose) exists; NitroStudio configured locally against the prod DB is **not** required (use Claude Code or the smoke script for prod MCP).

| # | Step | Expected | ✓ |
|---|---|---|---|
| 1 | Open the home page on a phone-size viewport (DevTools 390 px) and desktop | Loader on first visit only; hero fire; no horizontal scroll; sections animate; reduced-motion OS setting → static | |
| 2 | Sign in with GitHub | lands on `/app`, onboarding complete (if prepared) | |
| 3 | `pnpm fixture:break` | prints "Production is broken at <sha>"; demo `/api/health` = 500 | |
| 4 | `pnpm fixture:fire` | 202 + incident URL | |
| 5 | Open the incident | within ~10 s: status Triaged→Needs approval; bad/good deployments; top suspect = `refactor: support stacked discounts` with `applyDiscount`/`lib/pricing.ts` evidence | |
| 6 | Explanation card | ready (or skipped with clear copy if no key) | |
| 7 | Claude Code: "what's on fire?" → `list_incidents`/`get_incident`; "which commit?" → `get_suspects` | correct data; widgets render in clients that support them | |
| 8 | Approve in the web app (hold-to-confirm) | status Rolling back → Verifying; timeline shows `action_executed`, `production_confirmed` | |
| 9 | Watch probes | 3 green → Recovered; banner about Vercel auto-deploys | |
| 10 | Demo `/api/health` | 200 with the **good** SHA | |
| 11 | Claude Code: "did it work?" → `get_action_status` | `verified` | |
| 12 | `pnpm fixture:reset` | demo healthy at a new SHA, production promoted | |
| 13 | Run 3→4 again but **Reject** | incident back to Triaged; no Vercel call. Then **Mark resolved** the incident and run `pnpm fixture:reset` | |
| 14 | Run 3→4 again (new incident, `deduped: false`), wait 15 min without approving | action Expired, incident back to Triaged. Then **Mark resolved** + `pnpm fixture:reset` | |
| 15 | Send a bad signature (`curl` with wrong secret) | 401 | |
| 16 | Revoke the MCP key, call a tool | UNAUTHENTICATED within 60 s | |

## 4. Release checklist

- [ ] §3 rows 1–16 pass on production.
- [ ] CI green (typecheck, lint, unit, build).
- [ ] Lighthouse mobile home: Perf ≥ 90, A11y 100, BP 100, SEO 100 (record numbers).
- [ ] `robots.txt`, `sitemap.xml`, `llms.txt`, OG image render at their URLs; OG preview checked (e.g. opengraph.xyz).
- [ ] No secrets in logs (search Vercel/Northflank logs for `fbk_`, `whsec_`, `sk-`, `vcp_`, `ghs_`).
- [ ] `.env.example` lists every variable; README has setup + demo + architecture diagram + security notes.
- [ ] `CONTEXT.md` is current (milestones ticked, decisions, deviations).
- [ ] Demo video/GIF recorded (60–90 s): break → fire → suspects → approve → verified, plus the same in an MCP client.
