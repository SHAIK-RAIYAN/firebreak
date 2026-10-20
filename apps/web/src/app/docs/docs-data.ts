export interface DocItem {
  slug: string;
  title: string;
  description: string;
  category: string;
  badge?: string;
  readingTime: string;
  content: {
    lead: string;
    sections: {
      id: string;
      title: string;
      text?: string;
      codeBlock?: {
        code: string;
        language?: string;
        title?: string;
      };
      table?: {
        headers: string[];
        rows: string[][];
      };
      callout?: {
        type: "info" | "warn" | "danger" | "ok";
        title?: string;
        text: string;
      };
      diagram?: {
        src: string;
        alt: string;
        caption?: string;
      };
    }[];
  };
}

export interface DocCategory {
  name: string;
  items: {
    slug: string;
    title: string;
    badge?: string;
  }[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    name: "Getting Started",
    items: [
      { slug: "overview", title: "Introduction", badge: "START" },
      { slug: "quickstart", title: "Quickstart Guide", badge: "5 MIN" },
      { slug: "architecture", title: "System Architecture" },
      { slug: "development", title: "Development & Repos" },
    ],
  },
  {
    name: "Backend Core",
    items: [
      { slug: "backend", title: "Backend Architecture", badge: "ENGINE" },
      { slug: "database", title: "Database & Drizzle ORM" },
      { slug: "integrations", title: "External Integrations" },
      { slug: "workflows", title: "Incident Workflows", badge: "6-STEP" },
    ],
  },
  {
    name: "Model Context Protocol",
    items: [
      { slug: "mcp", title: "MCP Overview", badge: "PROTOCOL" },
      { slug: "tools", title: "Tools & Live Widgets", badge: "9 TOOLS" },
      { slug: "nitrostack", title: "NitroStack & AI Hosts" },
    ],
  },
  {
    name: "Operations & Safety",
    items: [
      { slug: "configuration", title: "Configuration & Secrets" },
      { slug: "deployment", title: "Production Deployment", badge: "CLOUD" },
      { slug: "security", title: "Security & Guard Rails", badge: "SAFETY" },
      { slug: "troubleshooting", title: "Troubleshooting Matrix" },
    ],
  },
  {
    name: "Contributing",
    items: [
      { slug: "contributing", title: "Extending Firebreak" },
    ],
  },
];

export const DOCS_DATA: Record<string, DocItem> = {
  overview: {
    slug: "overview",
    title: "Introduction to Firebreak",
    description: "Autonomous incident mitigation and verified rollback platform for web applications on Vercel and GitHub.",
    category: "Getting Started",
    badge: "START",
    readingTime: "3 min",
    content: {
      lead: "Firebreak is an automated incident mitigation and verified rollback platform engineered for teams deploying web applications on Vercel and source code on GitHub. Powered by the NitroStack Model Context Protocol (MCP) framework.",
      sections: [
        {
          id: "problem",
          title: "The Problem Firebreak Solves",
          text: "When a bad commit crashes production after a deployment, teams face a chaotic 45-minute fire drill. Monitoring alerts only point out the symptom (e.g. 500 error spike), forcing on-call engineers to manually inspect commits, guess the culprit, and hesitate over rollbacks for fear of breaking database state or reverting unrelated releases.",
          callout: {
            type: "info",
            title: "MTTR Reduction",
            text: "Firebreak transforms this manual diagnostic loop into a mathematically verified 55-second recovery cycle with full auditability.",
          },
        },
        {
          id: "lifecycle",
          title: "The 6-Step Closed-Loop Lifecycle",
          text: "Firebreak operates as a deterministic finite-state machine across six discrete phases:",
          table: {
            headers: ["Step", "Name", "Responsibility"],
            rows: [
              ["1", "DETECT", "Ingests alerts via HMAC SHA-256 signed webhooks. Deduplicates against a 15-minute sliding fingerprint window."],
              ["2", "TRACE", "Matches broken vs. last-known-good deployments. Runs an 8-factor commit blame scorer (+40 file match, +30 hunk, +25 symbol)."],
              ["3", "PROPOSE", "Runs 6 preflight safety gates (target readiness, drift check, uniqueness). Stages a rollback with a 15-min TTL."],
              ["4", "APPROVE", "Enforces human-in-the-loop authorization via a 1,500ms Hold-to-Confirm web button or authenticated MCP tool call."],
              ["5", "EXECUTE", "Rolls back production on Vercel atomically with an intelligent promote fallback that works across all Vercel tiers."],
              ["6", "VERIFY", "Polls the service's health URL every 10s until three consecutive 200 OK responses confirm full recovery."],
            ],
          },
          diagram: {
            src: "/diagrams/diagram-c-incident-lifecycle.svg",
            alt: "Incident Lifecycle State Diagram",
            caption: "The 6-Step Incident Lifecycle State Machine",
          },
        },
        {
          id: "mcp-ecosystem",
          title: "Native Model Context Protocol (MCP)",
          text: "Rather than building a simple read-only dashboard or conversational chatbot, Firebreak exposes its full operational capability as an official Model Context Protocol server. AI agents (Claude Desktop, Cursor, ChatGPT) can list active incidents, inspect suspect commits with code diffs, and stage rollback proposals directly in their chat interface.",
        },
      ],
    },
  },

  quickstart: {
    slug: "quickstart",
    title: "Quickstart Guide",
    description: "Get Firebreak running locally from a fresh repository clone in under 5 minutes.",
    category: "Getting Started",
    badge: "5 MIN",
    readingTime: "4 min",
    content: {
      lead: "Follow this step-by-step developer guide to clone the repository, configure secrets, migrate the database, and run both the web console and the MCP server locally.",
      sections: [
        {
          id: "prerequisites",
          title: "1. Prerequisites",
          text: "Ensure your development machine has Node.js (v20+ or v22+), npm (v10+), Git, and a PostgreSQL database URL (Neon Serverless recommended).",
        },
        {
          id: "clone",
          title: "2. Clone & Install Dependencies",
          text: "Clone the repo and install workspace dependencies via npm workspaces:",
          codeBlock: {
            language: "bash",
            code: "git clone https://github.com/SHAIK-RAIYAN/firebreak.git\ncd firebreak\nnpm install",
          },
        },
        {
          id: "env",
          title: "3. Configure Environment Variables",
          text: "Copy the template configuration to .env and configure your secrets:",
          codeBlock: {
            language: "bash",
            title: ".env",
            code: "cp .env.example .env\n\n# Configure DATABASE_URL from your Neon console:\nDATABASE_URL=\"postgresql://user:password@ep-pooler.region.aws.neon.tech/neondb?sslmode=require\"\n\n# Generate 32-byte Base64 secrets for keys:\nBETTER_AUTH_SECRET=\"your-32-byte-base64-secret\"\nENCRYPTION_KEY=\"your-32-byte-base64-secret\"\nSTATE_SECRET=\"your-32-byte-base64-secret\"\n\n# Advisory AI Provider:\nDEFAULT_AI_API_KEY=\"your-google-gemini-key\"",
          },
          callout: {
            type: "warn",
            title: "Secret Key Generator",
            text: "Generate cryptographically secure 32-byte keys with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
          },
        },
        {
          id: "database",
          title: "4. Push Database Schema",
          text: "Apply the 17 Drizzle ORM table definitions directly to your PostgreSQL database:",
          codeBlock: {
            language: "bash",
            code: "npx drizzle-kit push",
          },
        },
        {
          id: "run",
          title: "5. Start Development Servers",
          text: "Launch the Next.js Web Console (port 3000) and NitroStack MCP server (port 3001) simultaneously via Turborepo:",
          codeBlock: {
            language: "bash",
            code: "npm run dev",
          },
        },
        {
          id: "verify",
          title: "6. Verify Local Installation",
          text: "Open http://localhost:3000 to view the Web Console. In a separate terminal, launch NitroStack Studio to test MCP tools:",
          codeBlock: {
            language: "bash",
            code: "npx nitrostack-cli studio",
          },
        },
      ],
    },
  },

  architecture: {
    slug: "architecture",
    title: "System Architecture",
    description: "High-level architectural overview, component boundaries, and request topologies.",
    category: "Getting Started",
    readingTime: "4 min",
    content: {
      lead: "Firebreak separates responsibilities across two independent client-facing servers and a shared domain engine operating over a pooled PostgreSQL database.",
      sections: [
        {
          id: "topology",
          title: "High-Level System Topology",
          text: "The web console (apps/web) and MCP server (apps/mcp) are peer applications. Neither proxies through the other; both execute domain logic against @firebreak/core and synchronize state directly through Neon PostgreSQL.",
          diagram: {
            src: "/diagrams/diagram-a-system-architecture.svg",
            alt: "System Architecture Diagram",
            caption: "System Architecture: Ingress, Gateways, Core Engine, Persistence, and Cloud Providers",
          },
        },
        {
          id: "components",
          title: "Component Boundaries",
          table: {
            headers: ["Component", "Runtime / Framework", "Target Host", "Primary Role"],
            rows: [
              ["apps/web", "Next.js 16 / React 19", "Vercel Edge", "Human web console, webhook ingestion gateway, Inngest durable job runner."],
              ["apps/mcp", "NitroStack / Node.js", "NitroCloud", "Universal MCP server exposing 9 typed tools and 3 interactive React widgets."],
              ["packages/core", "TypeScript (tsup)", "Shared Package", "Drizzle ORM schema, bisection engine, preflight checks, cloud adapters, AES crypto."],
              ["Database", "Neon PostgreSQL", "Neon Serverless", "17 relational tables tracking services, alerts, incidents, suspects, actions, and audit logs."],
            ],
          },
        },
        {
          id: "boundaries",
          title: "Monorepo & Task Boundaries",
          text: "Turborepo orchestrates builds in topological order (^build). The shared core package compiles to dist/index.js and dist/index.d.ts before dependent applications begin compiling.",
          diagram: {
            src: "/diagrams/diagram-b-monorepo-boundaries.svg",
            alt: "Monorepo Boundaries Diagram",
            caption: "Monorepo Workspace & Compilation Pipeline",
          },
        },
      ],
    },
  },

  development: {
    slug: "development",
    title: "Development & Repositories",
    description: "Monorepo organization, Turborepo tasks, and daily developer commands.",
    category: "Getting Started",
    readingTime: "3 min",
    content: {
      lead: "Firebreak is structured as an npm workspaces monorepo managed by Turborepo, allowing atomic changes across frontend, MCP tools, and shared domain logic.",
      sections: [
        {
          id: "workspace-layout",
          title: "Repository Layout",
          text: "The repository divides responsibilities cleanly between user applications and shared packages:",
          codeBlock: {
            language: "text",
            title: "Directory Structure",
            code: "firebreak/\n├── apps/\n│   ├── web/         # Next.js 16 Web Dashboard & Inngest Runner (Port 3000)\n│   └── mcp/         # NitroStack Model Context Protocol Server (Port 3001)\n├── packages/\n│   ├── core/        # Shared Drizzle ORM, Bisection Engine, Adapters, Crypto\n│   └── fixtures/    # Demo break/fix automation scripts and webhook tests\n├── scripts/         # Root deployment hooks (prepare-nitrocloud.mjs)\n├── package.json     # Root manifest & orchestrator scripts\n└── turbo.json       # Turborepo task pipeline rules",
          },
        },
        {
          id: "scripts",
          title: "Verified Developer Scripts",
          table: {
            headers: ["Command", "Action", "Description"],
            rows: [
              ["npm run dev", "turbo run dev", "Starts Next.js (3000), MCP (3001), and core tsup watcher in parallel."],
              ["npm run build:all", "turbo run build", "Full topological build of all packages and static widgets."],
              ["npm run build", "NitroCloud build", "Builds core, compiles MCP, and stages root files via prepare-nitrocloud.mjs."],
              ["npm run typecheck", "turbo run typecheck", "Strict TypeScript check (tsc --noEmit) across all packages."],
              ["npm run test", "turbo run test", "Executes Vitest unit and integration test suites in packages/core."],
              ["npm run lint", "turbo run lint", "Runs ESLint code quality checks."],
              ["npm run fixture:break", "Demo Buster", "Pushes 3 commits with a bug to GitHub and waits for 500."],
              ["npm run fixture:fire", "Alert Dispatcher", "Sends HMAC-signed alert webhook to trigger incident room."],
              ["npm run fixture:reset", "Demo Reset", "Restores healthy status and clears demo incidents."],
            ],
          },
        },
      ],
    },
  },

  backend: {
    slug: "backend",
    title: "Backend Architecture",
    description: "Layered backend architecture, route handlers, Inngest durable jobs, and domain services.",
    category: "Backend Core",
    badge: "ENGINE",
    readingTime: "4 min",
    content: {
      lead: "Firebreak's backend follows a strict layered pattern dividing responsibilities into HTTP Gateways, Security Guards, Domain Services, Infrastructure Adapters, and Persistence.",
      sections: [
        {
          id: "gateways",
          title: "Gateways and Ingestion Endpoints",
          text: "External signals enter Firebreak through two hardened endpoints:",
          codeBlock: {
            language: "typescript",
            title: "apps/web/src/app/api/v1/alerts/[serviceId]/route.ts",
            code: "// HMAC SHA-256 validation using constant-time comparison\nconst expected = crypto.createHmac(\"sha256\", secret).update(rawBody).digest(\"hex\");\nif (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {\n  return NextResponse.json({ error: \"Invalid signature\" }, { status: 401 });\n}\n\n// Deduplicate alert & dispatch durable workflow\nconst incident = await AlertService.ingestAlert(serviceId, payload);\nawait inngest.send({ name: \"firebreak/incident.created\", data: { incidentId: incident.id } });\nreturn NextResponse.json({ status: \"accepted\", incidentId: incident.id }, { status: 202 });",
          },
        },
        {
          id: "services-table",
          title: "Core Domain Services",
          table: {
            headers: ["Service", "Path", "Core Responsibility"],
            rows: [
              ["alerts.ts", "packages/core/src/services/alerts.ts", "Alert ingestion, sliding window deduplication, and fingerprint calculation."],
              ["trace.ts", "packages/core/src/services/trace.ts", "Coordinates deployment identification and commit delta retrieval."],
              ["ranking.ts", "packages/core/src/domain/ranking.ts", "The 8-factor commit blame scoring algorithm and path normalizer."],
              ["preflight.ts", "packages/core/src/domain/preflight.ts", "Pure evaluation of the 6 rollback safety checks."],
              ["actions.ts", "packages/core/src/services/actions.ts", "Stages proposals with 15-min TTL, enforces approval, and executes rollback."],
              ["probe.ts", "packages/core/src/adapters/probe.ts", "Runs automated canary health checks requiring a 3x consecutive 200 OK streak."],
            ],
          },
        },
      ],
    },
  },

  database: {
    slug: "database",
    title: "Database & Drizzle ORM",
    description: "PostgreSQL schema, Neon serverless connection pooling, and the 17 relational tables.",
    category: "Backend Core",
    readingTime: "4 min",
    content: {
      lead: "Firebreak uses PostgreSQL hosted on Neon Serverless as its authoritative persistence engine, accessed through Drizzle ORM for compile-time type safety.",
      sections: [
        {
          id: "pooling",
          title: "Serverless Connection Pooling",
          text: "Using @neondatabase/serverless over secure WebSockets (wss://), Firebreak multiplexes thousands of incoming queries from serverless functions across a managed pool, preventing connection exhaustion.",
        },
        {
          id: "erd",
          title: "Relational Entity Map",
          text: "The schema defines 17 tables organized into clear functional domains:",
          diagram: {
            src: "/diagrams/diagram-e-database-erd.svg",
            alt: "PostgreSQL ERD Diagram",
            caption: "PostgreSQL Relational Schema: Workspaces, Integrations, Services, Telemetry, and Mitigation Actions",
          },
        },
        {
          id: "tables",
          title: "Table Inventory Overview",
          table: {
            headers: ["Category", "Tables", "Primary Purpose"],
            rows: [
              ["Identity & Tenancy", "user, session, account, workspaces, workspace_members", "Authentication (Better Auth), multi-tenant organization boundaries."],
              ["Integrations", "github_installations, vercel_connections", "AES-256-GCM encrypted tokens for GitHub App and Vercel."],
              ["Telemetry", "services, alerts", "Monitored production apps and incoming raw error payloads."],
              ["Incidents & Mitigation", "incidents, suspects, analyses, actions, probes, timeline_events", "State machine tracking active outages, ranked culprit commits, staged proposals, canary probes, and immutable audit logs."],
              ["Auxiliaries", "mcp_api_keys, processed_webhooks, email_deliveries", "Hashed API keys for AI agents, webhook dedup, and Resend audit logs."],
            ],
          },
        },
      ],
    },
  },

  integrations: {
    slug: "integrations",
    title: "External Integrations",
    description: "Deep dive into GitHub App, Vercel promote fallback, Neon, Google Gemini, and Resend.",
    category: "Backend Core",
    readingTime: "4 min",
    content: {
      lead: "Firebreak integrates upstream source control, edge deployment platforms, serverless databases, AI inference engines, and transactional email services.",
      sections: [
        {
          id: "github-app",
          title: "GitHub App Integration",
          text: "Firebreak uses an official GitHub App with RS256 private keys to generate short-lived Installation Access Tokens. It calls GET /repos/{owner}/{repo}/compare/{base}...{head} to retrieve the exact commit list and unified git diffs between deployments.",
        },
        {
          id: "vercel-promote",
          title: "Vercel Rollback & The Promote Fallback",
          text: "Vercel Hobby accounts reject rollbacks older than 1 release with HTTP 402 (VERCEL_PLAN_LIMIT). Firebreak catches this error and automatically triggers an atomic deployment promotion:",
          codeBlock: {
            language: "typescript",
            title: "packages/core/src/adapters/vercel.ts",
            code: "if (reason === \"VERCEL_PLAN_LIMIT\" || msg.includes(\"upgrade to pro\")) {\n  // Automatically fallback to atomic promotion which works on all Vercel tiers!\n  const promoteRes = await this.promote(projectId, deploymentId);\n  return { status: promoteRes.status, body: { promoted: true, fallback: \"promote\" } };\n}",
          },
          callout: {
            type: "ok",
            title: "All Vercel Plans Supported",
            text: "This atomic promote fallback ensures that production rollbacks work seamlessly across Hobby, Pro, and Enterprise accounts.",
          },
        },
        {
          id: "ai-boundaries",
          title: "Advisory AI Engine Boundaries",
          text: "Large Language Models (Google Gemini 2.5 Flash / OpenAI GPT-4o-mini) are strictly advisory. Commit bisection and safety gates are 100% deterministic TypeScript. The AI is only invoked to write a 2-sentence explanation and suggested fix for the operator UI.",
        },
      ],
    },
  },

  workflows: {
    slug: "workflows",
    title: "Incident Recovery Workflows",
    description: "Step-by-step trace of alert deduplication, 8-factor commit ranking, preflight gates, and canary streaks.",
    category: "Backend Core",
    badge: "6-STEP",
    readingTime: "4 min",
    content: {
      lead: "This guide details the closed-loop recovery state machine from initial error alert to verified restoration.",
      sections: [
        {
          id: "sequence",
          title: "End-to-End Execution Sequence",
          diagram: {
            src: "/diagrams/diagram-g-sequence-flow.svg",
            alt: "Sequence Flow Diagram",
            caption: "Chronological Sequence: Webhook Ingest, Multi-Factor Bisection, Human Approval, Rollback, and Canary Verification",
          },
        },
        {
          id: "ranking-engine",
          title: "The 8-Factor Commit Blame Scorer",
          text: "Every commit shipped in a broken release bundle is evaluated against the runtime error and stack trace using an 8-factor mathematical scoring model:",
          table: {
            headers: ["Factor", "Scoring Rule", "Points Awarded"],
            rows: [
              ["1", "Exact File Match in Stack Trace", "+40 pts"],
              ["2", "Line Number in Diff Hunk Range", "+30 pts"],
              ["3", "Function / Symbol in Diff Patch", "+25 pts"],
              ["4", "Symbol Mentioned in Commit Message", "+25 pts"],
              ["5", "Same Directory Match", "+10 pts"],
              ["6", "Error Token in Commit Message", "+10 pts"],
              ["7", "Error Token in Diff Patch", "+8 pts"],
              ["8", "Recency Decay (newer commits favored)", "Up to +10 pts"],
            ],
          },
        },
        {
          id: "preflight-checks",
          title: "The 6 Preflight Rollback Safety Gates",
          text: "Before an operator can approve a rollback, 6 safety assertions are evaluated:",
          table: {
            headers: ["Check", "Type", "Safety Assertion"],
            rows: [
              ["target_ready", "Blocking", "Target deployment on Vercel must be in READY state."],
              ["target_differs", "Blocking", "Target deployment ID and SHA must differ from current broken production."],
              ["target_not_known_bad", "Blocking", "Target deployment has not caused an earlier recorded incident."],
              ["no_drift", "Blocking", "Live production has not changed since the proposal was generated."],
              ["not_expired", "Blocking", "Proposal must be approved within its 15-minute Time-to-Live."],
              ["still_failing", "Warning", "Advisory check confirming service is still failing (turns yellow if recovered)."],
            ],
          },
        },
      ],
    },
  },

  mcp: {
    slug: "mcp",
    title: "Model Context Protocol (MCP)",
    description: "What MCP is, how Firebreak implements it, dual transports, and McpKeyGuard.",
    category: "Model Context Protocol",
    badge: "PROTOCOL",
    readingTime: "4 min",
    content: {
      lead: "The Model Context Protocol (MCP) standardizes how AI models connect to external tools and live user interfaces. Firebreak implements an official MCP server conforming to the protocol specification.",
      sections: [
        {
          id: "transports",
          title: "Universal Dual-Transport Architecture",
          text: "Firebreak's MCP server operates across two distinct transport modes:",
          diagram: {
            src: "/diagrams/diagram-d-mcp-architecture.svg",
            alt: "MCP Architecture Diagram",
            caption: "MCP Server Architecture: Dual Transports (STDIO & SSE), McpKeyGuard, and Tools / Widgets Pipeline",
          },
          table: {
            headers: ["Transport", "Protocol", "Primary Consumer", "Port / Pipe"],
            rows: [
              ["STDIO", "JSON-RPC 2.0 over Standard I/O", "Local desktop AI agents (Claude Desktop, Cursor CLI)", "Process stdin / stdout"],
              ["HTTP SSE", "JSON-RPC 2.0 over Server-Sent Events", "Cloud-hosted AI models, NitroStack Studio, web agents", "Port 3001/3005 (/sse)"],
            ],
          },
        },
        {
          id: "auth-guard",
          title: "Scoped Authentication (McpKeyGuard)",
          text: "Cloud requests must supply an Authorization: Bearer fb_mcp_... header. McpKeyGuard hashes the key and asserts required scopes:",
          table: {
            headers: ["Scope", "Permissions"],
            rows: [
              ["services:read", "Allowed to discover protected services (list_services)."],
              ["incidents:read", "Allowed to list incidents, inspect suspects, and retrieve timelines."],
              ["actions:propose", "Allowed to stage rollback proposals (propose_rollback)."],
              ["actions:approve", "Allowed to trigger live production rollbacks (approve_action)."],
            ],
          },
        },
      ],
    },
  },

  tools: {
    slug: "tools",
    title: "MCP Tools & Live Widgets Reference",
    description: "Complete reference for all 9 registered operational tools and 3 interactive React widgets.",
    category: "Model Context Protocol",
    badge: "9 TOOLS",
    readingTime: "4 min",
    content: {
      lead: "Firebreak exposes 9 typed operational tools and 3 interactive React widgets within the Model Context Protocol runtime.",
      sections: [
        {
          id: "tools-table",
          title: "Master Tool Reference Table",
          table: {
            headers: ["Tool Name", "Scope Required", "Type", "Attached Widget", "Description"],
            rows: [
              ["list_services", "services:read", "Read-only", "—", "Lists all protected services, GitHub repos, Vercel projects, and active health status."],
              ["list_incidents", "incidents:read", "Read-only", "—", "Lists open and resolved incidents for the workspace. Primary entry point when asking what broke."],
              ["get_incident", "incidents:read", "Read-only", "incident-card", "Retrieves incident details, broken vs. healthy deployments, top suspect, and status."],
              ["get_suspects", "incidents:read", "Read-only", "suspect-list", "Returns candidate commits ranked by deterministic blame score with file/symbol evidence."],
              ["get_analysis", "incidents:read", "Read-only", "—", "Returns advisory AI narrative explaining the failure mechanism and suggested code fix."],
              ["get_timeline", "incidents:read", "Read-only", "—", "Returns chronological audit trail of alerts, ranking, actions, approvals, and probe events."],
              ["propose_rollback", "actions:propose", "Idempotent", "action-status", "Runs 6 safety checks and stages a rollback to the last-good deployment."],
              ["get_action_status", "incidents:read", "Read-only", "action-status", "Tracks live status of a rollback: awaiting approval, executing, verifying, or completed."],
              ["approve_action", "actions:approve", "Destructive", "action-status", "Human/authorized sign-off that triggers live Vercel rollback and canary verification."],
            ],
          },
        },
        {
          id: "widgets",
          title: "The Three Interactive React Widgets",
          text: "When invoked, tools attach rich interactive micro-frontends exported as static bundles from apps/mcp/src/widgets/out/:",
          table: {
            headers: ["Widget", "Triggering Tool", "Visual Elements Rendered"],
            rows: [
              ["/incident-card", "get_incident", "Pulsing red severity badge, broken production SHA vs. recovery SHA, top suspect commit message, and deep-link button."],
              ["/suspect-list", "get_suspects", "Vertical leaderboard of candidate commits sorted by rank (#1, #2), blame score percentage (92%), and code diff tags."],
              ["/action-status", "propose_rollback, approve_action", "6 Preflight Safety Gate checkmarks, 15-minute countdown timer, and an animated Canary Progress Bar."],
            ],
          },
        },
      ],
    },
  },

  nitrostack: {
    slug: "nitrostack",
    title: "NitroStack & Supported Hosts",
    description: "Studio inspection, NitroCloud deployment hook, and ChatGPT connectivity reality.",
    category: "Model Context Protocol",
    readingTime: "3 min",
    content: {
      lead: "NitroStack provides the developer tooling and cloud hosting infrastructure for Firebreak's MCP server.",
      sections: [
        {
          id: "studio",
          title: "Local Testing in NitroStack Studio",
          text: "During development, start Firebreak and open Studio to inspect tools and preview live widgets:",
          codeBlock: {
            language: "bash",
            code: "# Terminal 1: Start dev servers\nnpm run dev\n\n# Terminal 2: Launch NitroStack Studio\nnpx nitrostack-cli studio",
          },
        },
        {
          id: "nitrocloud",
          title: "NitroCloud Monorepo Build Bridge",
          text: "NitroCloud expects root-level artifacts. Firebreak synchronizes compiled files using scripts/prepare-nitrocloud.mjs during the build phase:",
          codeBlock: {
            language: "bash",
            code: "npm install && turbo run build --filter=@firebreak/mcp... && node scripts/prepare-nitrocloud.mjs",
          },
        },
        {
          id: "chatgpt",
          title: "ChatGPT Connectivity Reality Check",
          text: "OpenAI officially deprecated legacy 'ChatGPT Plugins' in early 2024. Firebreak connects to ChatGPT and compatible AI clients via the open Model Context Protocol over HTTPS SSE (https://firebreak-mcp.nitrostack.cloud/sse). No legacy plugin or browser extension code was written.",
        },
      ],
    },
  },

  configuration: {
    slug: "configuration",
    title: "Configuration & Secrets",
    description: "Master table of environment variables, sensitivity flags, and zero-downtime key rotation.",
    category: "Operations & Safety",
    readingTime: "4 min",
    content: {
      lead: "Firebreak uses strongly typed environment variables to configure database connections, cryptographic keys, and operational safety thresholds.",
      sections: [
        {
          id: "env-table",
          title: "Master Configuration Reference Table",
          table: {
            headers: ["Variable Name", "Required?", "Sensitive?", "Purpose"],
            rows: [
              ["DATABASE_URL", "Yes", "Yes", "Pooled PostgreSQL connection string for Neon Serverless."],
              ["ENCRYPTION_KEY", "Yes", "Yes", "32-byte Base64 key used for AES-256-GCM token encryption."],
              ["STATE_SECRET", "Yes", "Yes", "32-byte Base64 HMAC secret used to sign internal state tokens."],
              ["BETTER_AUTH_SECRET", "Yes", "Yes", "Cryptographic secret used to sign session cookies."],
              ["GITHUB_APP_PRIVATE_KEY", "Yes", "Yes", "RSA private key (PEM format) used for GitHub App tokens."],
              ["DEFAULT_AI_API_KEY", "Yes", "Yes", "API key for Google Gemini 2.5 Flash."],
              ["RESEND_API_KEY", "Optional", "Yes", "API key for Resend transactional email notifications."],
              ["PORT", "Optional", "No", "Port for MCP server (defaults to 3001 or 3005)."],
            ],
          },
        },
        {
          id: "rotation",
          title: "Zero-Downtime Key Rotation Procedure",
          text: "Rotate encryption keys across all database rows without application downtime:",
          codeBlock: {
            language: "bash",
            code: "# 1. Set ENCRYPTION_KEY_PREVIOUS to your active key\n# 2. Set ENCRYPTION_KEY to your new 32-byte Base64 key\n# 3. Execute the re-encryption runner:\nnpm run ops:reencrypt\n# 4. Remove ENCRYPTION_KEY_PREVIOUS once complete",
          },
        },
      ],
    },
  },

  deployment: {
    slug: "deployment",
    title: "Production Deployment",
    description: "Production topology across Vercel, NitroCloud, and Neon Serverless.",
    category: "Operations & Safety",
    badge: "CLOUD",
    readingTime: "3 min",
    content: {
      lead: "Firebreak uses a split deployment topology where the web application and MCP server deploy to specialized hosting platforms while sharing a serverless database.",
      sections: [
        {
          id: "cloud-topology",
          title: "Cloud Hosting Architecture",
          diagram: {
            src: "/diagrams/diagram-f-production-deployment.svg",
            alt: "Production Deployment Diagram",
            caption: "Production Cloud Topology: Vercel Edge, NitroCloud MCP Host, and Neon PostgreSQL",
          },
        },
        {
          id: "pre-deploy",
          title: "Pre-Deployment Verification Suite",
          text: "Before promoting changes to production, execute the complete quality pipeline:",
          codeBlock: {
            language: "bash",
            code: "# 1. Typecheck all packages\nnpm run typecheck\n\n# 2. Run unit & integration test suites\nnpm run test\n\n# 3. Run ESLint code quality checks\nnpm run lint\n\n# 4. Compile full monorepo\nnpm run build:all",
          },
        },
      ],
    },
  },

  security: {
    slug: "security",
    title: "Security & Guard Rails",
    description: "Timing-safe HMAC verification, AES-256-GCM token encryption, SSRF protection, and drift prevention.",
    category: "Operations & Safety",
    badge: "SAFETY",
    readingTime: "4 min",
    content: {
      lead: "Because Firebreak interfaces directly with production source code and live routing infrastructure, security is engineered in depth across every layer.",
      sections: [
        {
          id: "defenses",
          title: "Defensive Controls Matrix",
          table: {
            headers: ["Threat / Hazard", "Defensive Control", "Source Location"],
            rows: [
              ["Spoofed Webhooks", "Timing-safe HMAC SHA-256 validation (crypto.timingSafeEqual).", "packages/core/src/crypto/hmac.ts"],
              ["Database Token Theft", "Third-party access tokens encrypted at rest with AES-256-GCM.", "packages/core/src/crypto/secrets.ts"],
              ["SSRF Exploitation", "Health check probes blocked from private IPs and cloud metadata (169.254.169.254).", "packages/core/src/adapters/ssrf.ts"],
              ["Accidental Rollbacks", "Tactile 1,500ms Hold-to-Confirm web button; scoped permissions for MCP.", "apps/web/src/components/incident/hold-to-confirm-button.tsx"],
              ["Production Drift", "Preflight asserting live Vercel deployment has not changed since proposal creation.", "packages/core/src/domain/preflight.ts"],
            ],
          },
        },
        {
          id: "drift",
          title: "Drift Prevention During Outages",
          text: "If an engineer deploys a hotfix while an operator is reviewing a proposed rollback, Firebreak's no_drift preflight assertion detects that the live production deployment ID differs from the proposal's baseline. The proposal is immediately cancelled to prevent overwriting the hotfix.",
        },
      ],
    },
  },

  troubleshooting: {
    slug: "troubleshooting",
    title: "Troubleshooting Matrix",
    description: "Field diagnostic guide for Vercel 402 plan limits, connection pooling, and MCP auth failures.",
    category: "Operations & Safety",
    readingTime: "3 min",
    content: {
      lead: "Practical field diagnostic steps for symptoms encountered during development, testing, and production operations.",
      sections: [
        {
          id: "matrix",
          title: "Diagnostic Matrix",
          table: {
            headers: ["Symptom", "Likely Cause", "Remediation"],
            rows: [
              ["Rollback failed (402 VERCEL_PLAN_LIMIT)", "Vercel Hobby plan rejects rollbacks older than 1 release.", "Ensure the atomic promote fallback is active in packages/core/src/adapters/vercel.ts line 330."],
              ["Decryption failed: Unsupported state", "ENCRYPTION_KEY in .env does not match key used when encrypting.", "Revert ENCRYPTION_KEY or execute npm run ops:reencrypt to migrate keys."],
              ["Neon timeout / Pool exhausted", "Using direct unpooled URL in serverless functions.", "Ensure DATABASE_URL points to Neon's pooler endpoint with sslmode=require."],
              ["MCP Tool returns 401 Unauthorized", "Missing or invalid Bearer key hash in mcp_api_keys table.", "Generate a new API key in Settings (fb_mcp_...) and supply it in headers."],
              ["Probe blocked: SSRF_BLOCKED", "Health URL resolved to localhost or private RFC 1918 subnet.", "Firebreak's SSRF guard blocks internal IPs. Use a public URL or ngrok tunnel."],
            ],
          },
        },
      ],
    },
  },

  contributing: {
    slug: "contributing",
    title: "Extending Firebreak",
    description: "Step-by-step developer recipes for adding new MCP tools, database models, and cloud adapters.",
    category: "Contributing",
    readingTime: "3 min",
    content: {
      lead: "Learn how to extend Firebreak's capabilities without violating existing architectural boundaries.",
      sections: [
        {
          id: "add-tool",
          title: "Recipe: Adding a New MCP Tool",
          text: "To add a new tool (e.g. get_service_health):",
          codeBlock: {
            language: "typescript",
            title: "apps/mcp/src/modules/services/services.tools.ts",
            code: "@Tool({\n  name: \"get_service_health\",\n  title: \"Get service health\",\n  description: \"Runs an instant health check probe against a service's health_url.\",\n  inputSchema: GetServiceHealthInput,\n  annotations: { readOnlyHint: false, idempotentHint: true },\n})\n@UseGuards(McpKeyGuard)\nasync getServiceHealth(raw: unknown, ctx: ExecutionContext) {\n  const input = GetServiceHealthInput.parse(raw);\n  const id = identity(ctx);\n  requireScope(id, \"services:read\");\n  return runTool(ctx, () => probeServiceNow(coreCtx(id), input.serviceId));\n}",
          },
        },
        {
          id: "add-model",
          title: "Recipe: Adding a Database Table",
          text: "Define the table in packages/core/src/db/schema.ts and run npx drizzle-kit push:",
          codeBlock: {
            language: "typescript",
            title: "packages/core/src/db/schema.ts",
            code: "export const audit_logs = pgTable(\"audit_logs\", {\n  id: text(\"id\").primaryKey(),\n  workspaceId: text(\"workspace_id\").notNull().references(() => workspaces.id, { onDelete: \"cascade\" }),\n  action: text(\"action\").notNull(),\n  createdAt: timestamp(\"created_at\", { withTimezone: true }).defaultNow().notNull(),\n});",
          },
        },
      ],
    },
  },
};
