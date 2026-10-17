import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  real,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────
// Shared TypeScript domain types stored in JSONB columns
// ─────────────────────────────────────────────────────────────

export type DeploymentRef = {
  id: string;
  url: string;
  sha: string | null;
  createdAt: string;
  state: string;
  branch: string | null;
  created?: number;
  uid?: string;
};

export type SuspectFile = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  matched: boolean;
  patchExcerpt: string | null;
};

export type Evidence = {
  id: string;
  kind:
    | "file_exact"
    | "file_suffix"
    | "file_basename"
    | "line_in_hunk"
    | "symbol"
    | "error_token"
    | "risky_file"
    | "recency";
  label: string;
  detail: string;
  points: number;
};

export type PreflightCheck = {
  id:
    | "target_ready"
    | "target_differs"
    | "target_not_known_bad"
    | "no_drift"
    | "not_expired"
    | "still_failing";
  ok: boolean;
  blocking: boolean;
  detail: string;
};

// ─────────────────────────────────────────────────────────────
// 1. Better Auth tables
// ─────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────────────────────
// 2. Domain tables
// ─────────────────────────────────────────────────────────────

// 2.1 workspaces
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(), // ws_...
  name: text("name").notNull(),
  owner_user_id: text("owner_user_id")
    .notNull()
    .unique()
    .references(() => user.id),
  incident_seq: integer("incident_seq").notNull().default(0),
  ai_mode: text("ai_mode").notNull().default("default"), // 'default' | 'byok'
  ai_provider: text("ai_provider"), // 'anthropic' | 'openai' | 'google' | 'xai'
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 2.2 workspace_members
export const workspace_members = pgTable(
  "workspace_members",
  {
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspace_id, table.user_id] }),
  ],
);

// 2.3 github_installations
export const github_installations = pgTable("github_installations", {
  id: text("id").primaryKey(), // ghi_...
  workspace_id: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  installation_id: bigint("installation_id", { mode: "number" })
    .notNull()
    .unique(),
  account_login: text("account_login").notNull(),
  account_type: text("account_type").notNull(), // 'User' | 'Organization'
  repository_selection: text("repository_selection").notNull(), // 'all' | 'selected'
  suspended_at: timestamp("suspended_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 2.4 vercel_connections
export const vercel_connections = pgTable("vercel_connections", {
  id: text("id").primaryKey(), // vcn_...
  workspace_id: text("workspace_id")
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  team_id: text("team_id"),
  team_slug: text("team_slug"),
  account_label: text("account_label").notNull(),
  token_ciphertext: text("token_ciphertext").notNull(),
  token_iv: text("token_iv").notNull(),
  token_auth_tag: text("token_auth_tag").notNull(),
  token_key_version: integer("token_key_version").notNull(),
  token_last4: text("token_last4").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'invalid'
  validated_at: timestamp("validated_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 2.5 services
export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(), // svc_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    github_installation_id: text("github_installation_id")
      .notNull()
      .references(() => github_installations.id),
    repo_owner: text("repo_owner").notNull(),
    repo_name: text("repo_name").notNull(),
    repo_id: bigint("repo_id", { mode: "number" }).notNull(),
    production_branch: text("production_branch").notNull().default("main"),
    vercel_project_id: text("vercel_project_id").notNull(),
    vercel_project_name: text("vercel_project_name").notNull(),
    health_url: text("health_url").notNull(),
    health_expected_status: integer("health_expected_status")
      .notNull()
      .default(200),
    alert_secret_ciphertext: text("alert_secret_ciphertext").notNull(),
    alert_secret_iv: text("alert_secret_iv").notNull(),
    alert_secret_auth_tag: text("alert_secret_auth_tag").notNull(),
    alert_secret_key_version: integer("alert_secret_key_version").notNull(),
    alert_secret_last4: text("alert_secret_last4").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archived_at: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("services_ws_slug_idx").on(table.workspace_id, table.slug),
    index("services_ws_archived_idx").on(table.workspace_id, table.archived_at),
  ],
);

// 2.6 alerts
export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(), // alr_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    service_id: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    incident_id: text("incident_id"),
    external_id: text("external_id"),
    fingerprint: text("fingerprint").notNull(),
    title: text("title").notNull(),
    severity: text("severity").notNull(), // 'critical' | 'high' | 'medium' | 'low'
    source: text("source").notNull(),
    occurred_at: timestamp("occurred_at", { withTimezone: true }).notNull(),
    received_at: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    payload: jsonb("payload").notNull(),
  },
  (table) => [
    uniqueIndex("alerts_service_external_idx")
      .on(table.service_id, table.external_id)
      .where(sql`external_id IS NOT NULL`),
  ],
);

// 2.7 incidents
export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(), // inc_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    service_id: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull(),
    fingerprint: text("fingerprint").notNull(),
    trace_status: text("trace_status").notNull().default("pending"), // 'pending' | 'ready' | 'failed'
    trace_error: text("trace_error"),
    trace_confidence: text("trace_confidence"), // 'high' | 'low'
    bad_deployment: jsonb("bad_deployment").$type<DeploymentRef | null>(),
    good_deployment: jsonb("good_deployment").$type<DeploymentRef | null>(),
    alert_count: integer("alert_count").notNull().default(1),
    opened_at: timestamp("opened_at", { withTimezone: true }).notNull(),
    last_alert_at: timestamp("last_alert_at", { withTimezone: true }).notNull(),
    resolved_at: timestamp("resolved_at", { withTimezone: true }),
    closed_reason: text("closed_reason"), // 'verified' | 'manual' | 'dismissed'
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("incidents_ws_number_idx").on(table.workspace_id, table.number),
    uniqueIndex("incidents_svc_fingerprint_idx")
      .on(table.service_id, table.fingerprint)
      .where(sql`status NOT IN ('resolved', 'dismissed')`),
    index("incidents_ws_status_opened_idx").on(
      table.workspace_id,
      table.status,
      table.opened_at,
    ),
  ],
);

// 2.8 suspects
export const suspects = pgTable(
  "suspects",
  {
    id: text("id").primaryKey(), // sus_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    incident_id: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    points: integer("points").notNull(),
    score: real("score").notNull(),
    sha: text("sha").notNull(),
    short_sha: text("short_sha").notNull(),
    message: text("message").notNull(),
    author_login: text("author_login"),
    author_name: text("author_name").notNull(),
    committed_at: timestamp("committed_at", { withTimezone: true }).notNull(),
    html_url: text("html_url").notNull(),
    files: jsonb("files").notNull().$type<SuspectFile[]>(),
    evidence: jsonb("evidence").notNull().$type<Evidence[]>(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("suspects_incident_sha_idx").on(table.incident_id, table.sha),
    index("suspects_incident_rank_idx").on(table.incident_id, table.rank),
  ],
);

// 2.9 analyses
export const analyses = pgTable(
  "analyses",
  {
    id: text("id").primaryKey(), // ana_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    incident_id: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull(), // 1..3
    status: text("status").notNull(), // 'pending' | 'ready' | 'failed' | 'skipped'
    skip_reason: text("skip_reason"), // 'no_key' | 'quota_exceeded'
    provider: text("provider"),
    model: text("model"),
    key_source: text("key_source"), // 'byok' | 'default'
    result: jsonb("result"), // sanitized Analysis
    error_code: text("error_code"),
    latency_ms: integer("latency_ms"),
    input_tokens: integer("input_tokens"),
    output_tokens: integer("output_tokens"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completed_at: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("analyses_incident_attempt_idx").on(
      table.incident_id,
      table.attempt,
    ),
  ],
);

// 2.10 actions
export const actions = pgTable(
  "actions",
  {
    id: text("id").primaryKey(), // act_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    incident_id: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    service_id: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("rollback"),
    status: text("status").notNull(),
    from_deployment: jsonb("from_deployment").notNull().$type<DeploymentRef>(),
    target_deployment: jsonb("target_deployment")
      .notNull()
      .$type<DeploymentRef>(),
    preflight: jsonb("preflight").notNull().$type<PreflightCheck[]>(),
    proposed_by: text("proposed_by").notNull(), // 'system' | 'user' | 'mcp'
    proposed_at: timestamp("proposed_at", { withTimezone: true }).notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    decided_by_user_id: text("decided_by_user_id"),
    decided_via: text("decided_via"), // 'web' | 'mcp'
    decided_at: timestamp("decided_at", { withTimezone: true }),
    decision_note: text("decision_note"),
    execution_started_at: timestamp("execution_started_at", {
      withTimezone: true,
    }),
    executed_at: timestamp("executed_at", { withTimezone: true }),
    vercel_response: jsonb("vercel_response"),
    verify_started_at: timestamp("verify_started_at", { withTimezone: true }),
    verify_finished_at: timestamp("verify_finished_at", { withTimezone: true }),
    error_code: text("error_code"),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("actions_live_incident_idx")
      .on(table.incident_id)
      .where(
        sql`status IN ('proposed', 'awaiting_approval', 'approved', 'executing', 'verifying')`,
      ),
  ],
);

// 2.11 probes
export const probes = pgTable(
  "probes",
  {
    id: text("id").primaryKey(), // prb_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    action_id: text("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    http_status: integer("http_status"),
    ok: boolean("ok").notNull(),
    latency_ms: integer("latency_ms"),
    observed_sha: text("observed_sha"),
    error: text("error"),
  },
  (table) => [
    uniqueIndex("probes_action_seq_idx").on(table.action_id, table.seq),
  ],
);

// 2.12 timeline_events
export const timeline_events = pgTable(
  "timeline_events",
  {
    id: text("id").primaryKey(), // evt_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    incident_id: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    type: text("type").notNull(),
    actor_type: text("actor_type").notNull(), // 'system' | 'user' | 'mcp' | 'ai'
    actor_id: text("actor_id"),
    summary: text("summary").notNull(),
    data: jsonb("data").notNull().default({}),
  },
  (table) => [
    index("timeline_incident_at_idx").on(table.incident_id, table.at),
  ],
);

// 2.13 Supporting tables
export const mcp_api_keys = pgTable("mcp_api_keys", {
  id: text("id").primaryKey(), // mck_...
  workspace_id: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  user_id: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  key_hash: text("key_hash").notNull().unique(),
  scopes: text("scopes").array().notNull(),
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revoked_at: timestamp("revoked_at", { withTimezone: true }),
});

export const ai_credentials = pgTable(
  "ai_credentials",
  {
    id: text("id").primaryKey(), // aic_...
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model"),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    auth_tag: text("auth_tag").notNull(),
    key_version: integer("key_version").notNull(),
    last4: text("last4").notNull(),
    status: text("status").notNull().default("active"), // 'active' | 'invalid'
    validated_at: timestamp("validated_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_credentials_ws_provider_idx").on(
      table.workspace_id,
      table.provider,
    ),
  ],
);

export const usage_counters = pgTable(
  "usage_counters",
  {
    key: text("key").notNull(),
    window: text("window").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.key, table.window] })],
);

export const processed_webhooks = pgTable("processed_webhooks", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  received_at: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// CamelCase aliases for convenience
export {
  timeline_events as timelineEvents,
  usage_counters as usageCounters,
  github_installations as githubInstallations,
  vercel_connections as vercelConnections,
  workspace_members as workspaceMembers,
  mcp_api_keys as mcpApiKeys,
  ai_credentials as aiCredentials,
  processed_webhooks as processedWebhooks,
};

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type Severity = AlertSeverity;

export type TimelineEventType =
  | "alert_received"
  | "alert_deduped"
  | "incident_opened"
  | "trace_started"
  | "deployments_resolved"
  | "suspects_ranked"
  | "trace_failed"
  | "analysis_ready"
  | "analysis_failed"
  | "analysis_skipped"
  | "action_proposed"
  | "preflight_failed"
  | "action_approved"
  | "approval_dispatch_failed"
  | "action_rejected"
  | "action_expired"
  | "action_cancelled"
  | "action_executing"
  | "action_executed"
  | "action_failed"
  | "production_confirmed"
  | "probe"
  | "verified"
  | "verification_failed"
  | "incident_resolved"
  | "incident_dismissed";

