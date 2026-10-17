import { eq, and, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { services, github_installations, incidents } from "../db/schema.js";
import { newId } from "../util/ids.js";
import { AppError } from "../domain/errors.js";
import { generateAlertSecret } from "../crypto/keys.js";
import { sealWith } from "../crypto/secrets.js";
import { validateHealthUrl } from "../adapters/ssrf.js";
import { probe, type ProbeResult } from "../adapters/probe.js";
import { githubForInstallation } from "../adapters/github.js";
import { getVercelClientForWorkspace } from "./integrations.js";
import type { ServiceContext } from "./context.js";

export const CreateServiceInputSchema = z.object({
  name: z.string().min(1).max(100),
  githubInstallationId: z.string().min(1), // row id 'ghi_...'
  repoOwner: z.string().min(1).max(100),
  repoName: z.string().min(1).max(100),
  productionBranch: z.string().min(1).max(100).default("main"),
  vercelProjectId: z.string().min(1).max(100),
  healthUrl: z.string().url().max(1000),
  healthExpectedStatus: z.number().int().min(100).max(599).default(200),
});

export type CreateServiceInput = z.infer<typeof CreateServiceInputSchema>;

export const UpdateServiceInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  productionBranch: z.string().min(1).max(100).optional(),
  healthUrl: z.string().url().max(1000).optional(),
  healthExpectedStatus: z.number().int().min(100).max(599).optional(),
});

export type UpdateServiceInput = z.infer<typeof UpdateServiceInputSchema>;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "service";
}

export async function createService(
  ctx: ServiceContext,
  rawInput: CreateServiceInput,
): Promise<{ service: any; alertSecret: string }> {
  const input = CreateServiceInputSchema.parse(rawInput);

  // 1. SSRF check healthUrl
  await validateHealthUrl(input.healthUrl);

  const database = db();

  // 2. Verify GitHub installation belongs to workspace and can read repo
  const instRows = await database
    .select()
    .from(github_installations)
    .where(
      and(
        eq(github_installations.id, input.githubInstallationId),
        eq(github_installations.workspace_id, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (instRows.length === 0 || !instRows[0]) {
    throw new AppError("NOT_FOUND", "GitHub installation not found in workspace", {
      reason: "GITHUB_NOT_FOUND",
    });
  }

  const inst = instRows[0];
  const gh = await githubForInstallation(inst.installation_id);
  let repoDetails;
  try {
    repoDetails = await gh.getRepo(input.repoOwner, input.repoName);
  } catch (err) {
    throw new AppError("FORBIDDEN", `Cannot access GitHub repository ${input.repoOwner}/${input.repoName}`, {
      reason: "GITHUB_FORBIDDEN",
    });
  }

  // 3. Verify Vercel project exists via workspace token
  const vercel = await getVercelClientForWorkspace(ctx);
  let vercelProject;
  try {
    vercelProject = await vercel.getProject(input.vercelProjectId);
  } catch (err) {
    throw new AppError("NOT_FOUND", `Vercel project ${input.vercelProjectId} not found`, {
      reason: "VERCEL_NOT_FOUND",
    });
  }

  // 4. Generate alert secret and seal it
  const serviceId = newId("svc");
  const alertSecret = generateAlertSecret();
  const aad = `${ctx.workspaceId}:alert:${serviceId}`;
  const sealed = await sealWith(aad, alertSecret);
  const last4 = alertSecret.slice(-4);

  // 5. Build slug (handle conflict with random suffix if needed)
  let slug = slugify(input.name);
  const existingSlug = await database
    .select()
    .from(services)
    .where(and(eq(services.workspace_id, ctx.workspaceId), eq(services.slug, slug)))
    .limit(1);

  if (existingSlug.length > 0) {
    slug = `${slug}-${newId().slice(0, 4)}`;
  }

  // 6. Insert service
  const serviceValues = {
    id: serviceId,
    workspace_id: ctx.workspaceId,
    name: input.name,
    slug,
    github_installation_id: inst.id,
    repo_owner: input.repoOwner,
    repo_name: input.repoName,
    repo_id: repoDetails.id,
    production_branch: input.productionBranch,
    vercel_project_id: input.vercelProjectId,
    vercel_project_name: vercelProject.name,
    health_url: input.healthUrl,
    health_expected_status: input.healthExpectedStatus,
    alert_secret_ciphertext: sealed.ciphertext,
    alert_secret_iv: sealed.iv,
    alert_secret_auth_tag: sealed.authTag,
    alert_secret_key_version: sealed.keyVersion,
    alert_secret_last4: last4,
  };

  await database.insert(services).values(serviceValues);

  return {
    service: {
      id: serviceId,
      workspaceId: ctx.workspaceId,
      name: input.name,
      slug,
      repo: `${input.repoOwner}/${input.repoName}`,
      vercelProjectName: vercelProject.name,
      healthUrl: input.healthUrl,
      healthExpectedStatus: input.healthExpectedStatus,
      createdAt: new Date().toISOString(),
    },
    alertSecret, // Plaintext returned only at creation time!
  };
}

export async function listServices(ctx: ServiceContext) {
  const database = db();
  const rows = await database
    .select({
      service: services,
      activeIncident: {
        id: incidents.id,
        number: incidents.number,
        status: incidents.status,
      },
    })
    .from(services)
    .leftJoin(
      incidents,
      and(
        eq(incidents.service_id, services.id),
        sql`${incidents.status} NOT IN ('resolved', 'dismissed')`,
      ),
    )
    .where(
      and(
        eq(services.workspace_id, ctx.workspaceId),
        isNull(services.archived_at),
      ),
    );

  return rows.map(({ service: s, activeIncident }) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    repo: `${s.repo_owner}/${s.repo_name}`,
    repoOwner: s.repo_owner,
    repoName: s.repo_name,
    productionBranch: s.production_branch,
    vercelProjectId: s.vercel_project_id,
    vercelProjectName: s.vercel_project_name,
    healthUrl: s.health_url,
    healthExpectedStatus: s.health_expected_status,
    activeIncident: activeIncident?.id ? activeIncident : null,
    createdAt: s.created_at.toISOString(),
  }));
}

export async function getService(ctx: ServiceContext, id: string) {
  const database = db();
  const rows = await database
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, id),
        eq(services.workspace_id, ctx.workspaceId),
        isNull(services.archived_at),
      ),
    )
    .limit(1);

  if (rows.length === 0 || !rows[0]) {
    throw new AppError("NOT_FOUND", "Service not found", {
      reason: "NOT_FOUND",
    });
  }

  const s = rows[0];
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    repo: `${s.repo_owner}/${s.repo_name}`,
    repoOwner: s.repo_owner,
    repoName: s.repo_name,
    productionBranch: s.production_branch,
    vercelProjectId: s.vercel_project_id,
    vercelProjectName: s.vercel_project_name,
    healthUrl: s.health_url,
    healthExpectedStatus: s.health_expected_status,
    createdAt: s.created_at.toISOString(),
  };
}

export async function updateService(
  ctx: ServiceContext,
  id: string,
  rawInput: UpdateServiceInput,
) {
  const input = UpdateServiceInputSchema.parse(rawInput);
  if (input.healthUrl) {
    await validateHealthUrl(input.healthUrl);
  }

  const database = db();
  const existing = await getService(ctx, id);

  const updates: Partial<typeof services.$inferInsert> = {
    updated_at: new Date(),
  };

  if (input.name) updates.name = input.name;
  if (input.productionBranch) updates.production_branch = input.productionBranch;
  if (input.healthUrl) updates.health_url = input.healthUrl;
  if (input.healthExpectedStatus) updates.health_expected_status = input.healthExpectedStatus;

  await database
    .update(services)
    .set(updates)
    .where(and(eq(services.id, id), eq(services.workspace_id, ctx.workspaceId)));

  return getService(ctx, id);
}

export async function archiveService(ctx: ServiceContext, id: string): Promise<void> {
  const database = db();
  await database
    .update(services)
    .set({
      archived_at: new Date(),
      updated_at: new Date(),
    })
    .where(and(eq(services.id, id), eq(services.workspace_id, ctx.workspaceId)));
}

export async function rotateAlertSecret(
  ctx: ServiceContext,
  id: string,
): Promise<{ alertSecret: string }> {
  await getService(ctx, id);

  const alertSecret = generateAlertSecret();
  const aad = `${ctx.workspaceId}:alert:${id}`;
  const sealed = await sealWith(aad, alertSecret);
  const last4 = alertSecret.slice(-4);

  const database = db();
  await database
    .update(services)
    .set({
      alert_secret_ciphertext: sealed.ciphertext,
      alert_secret_iv: sealed.iv,
      alert_secret_auth_tag: sealed.authTag,
      alert_secret_key_version: sealed.keyVersion,
      alert_secret_last4: last4,
      updated_at: new Date(),
    })
    .where(and(eq(services.id, id), eq(services.workspace_id, ctx.workspaceId)));

  return { alertSecret };
}

export async function checkHealthUrl(
  ctx: ServiceContext,
  url: string,
): Promise<ProbeResult> {
  await validateHealthUrl(url);
  return probe(url);
}
