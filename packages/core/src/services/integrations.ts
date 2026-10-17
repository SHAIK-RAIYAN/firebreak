import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { github_installations, vercel_connections, processed_webhooks } from "../db/schema.js";
import { newId } from "../util/ids.js";
import { requireEnv, optionalEnv } from "../util/env.js";
import { AppError } from "../domain/errors.js";
import { signState, verifyState, verifyGithubSignature } from "../crypto/hmac.js";
import { sealWith, openWith } from "../crypto/secrets.js";
import { vercelClient, type VercelProject } from "../adapters/vercel.js";
import {
  verifyInstallation,
  githubForInstallation,
  type RepoRef,
} from "../adapters/github.js";
import type { ServiceContext } from "./context.js";

export interface GithubInstallCandidate {
  githubInstallationId: number;
  accountLogin: string;
  accountType: string;
}

export interface IntegrationsStatus {
  github: {
    installations: Array<{
      id: string;
      githubInstallationId: number;
      accountLogin: string;
      accountType: string;
      repositorySelection: string;
      suspended: boolean;
    }>;
  };
  vercel: {
    connected: boolean;
    accountLabel: string | null;
    teamSlug: string | null;
    last4: string | null;
    status: string | null;
  };
}

export interface WorkspaceRepoRef extends RepoRef {
  installationRowId: string;
  githubInstallationId: number;
}

export async function startGithubInstall(ctx: ServiceContext): Promise<string> {
  const slug = requireEnv("GITHUB_APP_SLUG");
  const state = signState({
    workspaceId: ctx.workspaceId,
    nonce: newId(),
    exp: Math.floor(Date.now() / 1000) + 600,
  });

  return `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`;
}

export async function completeGithubInstall(
  ctx: ServiceContext,
  input: {
    installationId: number;
    code?: string;
    state?: string;
  },
): Promise<{ id: string; githubInstallationId: number; accountLogin: string }> {
  // 1. If state is present, verify workspace match
  if (input.state) {
    const verified = verifyState<{ workspaceId: string }>(input.state);
    if (!verified || verified.workspaceId !== ctx.workspaceId) {
      throw new AppError("FORBIDDEN", "Invalid or expired installation state token", {
        reason: "INSTALLATION_NOT_ACCESSIBLE",
      });
    }
  }

  // 2. If code is present, verify user-to-server ownership via GitHub OAuth token
  if (input.code) {
    const clientId = requireEnv("GITHUB_APP_CLIENT_ID");
    const clientSecret = requireEnv("GITHUB_APP_CLIENT_SECRET");

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: input.code,
      }),
    });

    if (!tokenRes.ok) {
      throw new AppError("UPSTREAM_ERROR", "Failed to exchange GitHub authorization code", {
        reason: "INSTALLATION_NOT_ACCESSIBLE",
      });
    }

    const tokenData = (await tokenRes.json()) as any;
    const userAccessToken = tokenData?.access_token;
    if (!userAccessToken) {
      throw new AppError("FORBIDDEN", "No access token returned by GitHub for installation ownership proof", {
        reason: "INSTALLATION_NOT_ACCESSIBLE",
      });
    }

    // Call GET /user/installations to prove this user owns/has access to the installation
    const userInstRes = await fetch("https://api.github.com/user/installations", {
      headers: {
        authorization: `Bearer ${userAccessToken}`,
        accept: "application/vnd.github+json",
      },
    });

    if (!userInstRes.ok) {
      throw new AppError("UPSTREAM_ERROR", "Failed to verify accessible installations for user", {
        reason: "INSTALLATION_NOT_ACCESSIBLE",
      });
    }

    const userInstData = (await userInstRes.json()) as any;
    const accessibleIds: number[] = (userInstData?.installations || []).map((i: any) => i.id);

    if (!accessibleIds.includes(input.installationId)) {
      throw new AppError("FORBIDDEN", "Installation is not accessible by the authenticated user", {
        reason: "INSTALLATION_NOT_ACCESSIBLE",
      });
    }
  }

  // 3. Verify installation details using App JWT
  const verifiedInst = await verifyInstallation(input.installationId);

  // 4. Ensure installation is not already claimed by a different workspace
  const database = db();
  const existing = await database
    .select()
    .from(github_installations)
    .where(eq(github_installations.installation_id, input.installationId))
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    const row = existing[0];
    if (row.workspace_id !== ctx.workspaceId) {
      throw new AppError("CONFLICT", "GitHub installation is already claimed by another workspace", {
        reason: "INSTALLATION_CLAIMED",
      });
    }
    // Update existing row
    await database
      .update(github_installations)
      .set({
        account_login: verifiedInst.account.login,
        account_type: verifiedInst.account.type,
        repository_selection: verifiedInst.repositorySelection,
        suspended_at: verifiedInst.suspendedAt ? new Date(verifiedInst.suspendedAt) : null,
        updated_at: new Date(),
      })
      .where(eq(github_installations.id, row.id));

    return {
      id: row.id,
      githubInstallationId: row.installation_id,
      accountLogin: verifiedInst.account.login,
    };
  }

  // 5. Insert new installation row
  const rowId = newId("ghi");
  await database.insert(github_installations).values({
    id: rowId,
    workspace_id: ctx.workspaceId,
    installation_id: input.installationId,
    account_login: verifiedInst.account.login,
    account_type: verifiedInst.account.type,
    repository_selection: verifiedInst.repositorySelection,
    suspended_at: verifiedInst.suspendedAt ? new Date(verifiedInst.suspendedAt) : null,
  });

  return {
    id: rowId,
    githubInstallationId: input.installationId,
    accountLogin: verifiedInst.account.login,
  };
}

export async function startGithubLink(ctx: ServiceContext): Promise<string> {
  const clientId = requireEnv("GITHUB_APP_CLIENT_ID");
  const state = signState({
    workspaceId: ctx.workspaceId,
    nonce: newId(),
    exp: Math.floor(Date.now() / 1000) + 600,
  });

  return `https://github.com/login/oauth/authorize?client_id=${clientId}&state=${encodeURIComponent(state)}`;
}

export async function listIntegrations(ctx: ServiceContext): Promise<IntegrationsStatus> {
  const database = db();

  const [ghRows, vRows] = await Promise.all([
    database
      .select()
      .from(github_installations)
      .where(eq(github_installations.workspace_id, ctx.workspaceId)),
    database
      .select()
      .from(vercel_connections)
      .where(eq(vercel_connections.workspace_id, ctx.workspaceId))
      .limit(1),
  ]);

  const vConn = vRows[0];

  return {
    github: {
      installations: ghRows.map((r) => ({
        id: r.id,
        githubInstallationId: r.installation_id,
        accountLogin: r.account_login,
        accountType: r.account_type,
        repositorySelection: r.repository_selection,
        suspended: Boolean(r.suspended_at),
      })),
    },
    vercel: vConn
      ? {
          connected: true,
          accountLabel: vConn.account_label,
          teamSlug: vConn.team_slug,
          last4: vConn.token_last4,
          status: vConn.status,
        }
      : {
          connected: false,
          accountLabel: null,
          teamSlug: null,
          last4: null,
          status: null,
        },
  };
}

export async function listGithubRepos(ctx: ServiceContext): Promise<WorkspaceRepoRef[]> {
  const database = db();
  const installations = await database
    .select()
    .from(github_installations)
    .where(eq(github_installations.workspace_id, ctx.workspaceId));

  const allRepos: WorkspaceRepoRef[] = [];

  for (const inst of installations) {
    if (inst.suspended_at) continue;
    try {
      const gh = await githubForInstallation(inst.installation_id);
      const repos = await gh.listRepos();
      for (const r of repos) {
        allRepos.push({
          ...r,
          installationRowId: inst.id,
          githubInstallationId: inst.installation_id,
        });
      }
    } catch (err) {
      // If one installation fails (e.g. revoked), proceed with others
    }
  }

  return allRepos;
}

export async function handleGithubWebhook(
  rawBody: string,
  signatureHeader?: string | null,
  deliveryId?: string | null,
): Promise<{ ok: boolean; deduped?: boolean }> {
  const secret = optionalEnv("GITHUB_WEBHOOK_SECRET", "");
  if (!verifyGithubSignature(secret, signatureHeader, rawBody)) {
    throw new AppError("INVALID_SIGNATURE", "Invalid GitHub webhook signature", {
      reason: "INVALID_SIGNATURE",
    });
  }

  const database = db();

  // Deduplicate by x-github-delivery if present
  if (deliveryId) {
    const existing = await database
      .select()
      .from(processed_webhooks)
      .where(eq(processed_webhooks.id, deliveryId))
      .limit(1);

    if (existing.length > 0) {
      return { ok: true, deduped: true };
    }

    try {
      await database.insert(processed_webhooks).values({
        id: deliveryId,
        source: "github",
        received_at: new Date(),
      });
    } catch {
      // Race condition duplicate insert
      return { ok: true, deduped: true };
    }
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { ok: false };
  }

  const action = event.action;
  const installationId = event.installation?.id;

  if (installationId) {
    if (action === "deleted") {
      await database
        .delete(github_installations)
        .where(eq(github_installations.installation_id, installationId));
    } else if (action === "suspend") {
      await database
        .update(github_installations)
        .set({ suspended_at: new Date(), updated_at: new Date() })
        .where(eq(github_installations.installation_id, installationId));
    } else if (action === "unsuspend") {
      await database
        .update(github_installations)
        .set({ suspended_at: null, updated_at: new Date() })
        .where(eq(github_installations.installation_id, installationId));
    }
  }

  return { ok: true };
}

export async function connectVercel(
  ctx: ServiceContext,
  input: {
    token: string;
    teamId?: string | null;
  },
): Promise<{ connected: boolean; accountLabel: string; last4: string }> {
  const cleanToken = input.token.trim();
  const cleanTeamId = input.teamId?.trim() || null;

  if (!cleanToken) {
    throw new AppError("VALIDATION_FAILED", "Vercel token is required", {
      reason: "VERCEL_TOKEN_REJECTED",
    });
  }

  // Validate live with Vercel API
  const client = vercelClient({ token: cleanToken, teamId: cleanTeamId });
  let user: { username: string };
  try {
    user = await client.getUser();
    if (cleanTeamId) {
      await client.listProjects();
    }
  } catch (err) {
    throw new AppError("VALIDATION_FAILED", `Invalid Vercel credentials: ${(err as Error).message}`, {
      reason: "VERCEL_TOKEN_REJECTED",
    });
  }

  // Encrypt token with AAD
  const aad = `${ctx.workspaceId}:vercel`;
  const sealed = await sealWith(aad, cleanToken);
  const last4 = cleanToken.slice(-4);

  const database = db();
  const existing = await database
    .select()
    .from(vercel_connections)
    .where(eq(vercel_connections.workspace_id, ctx.workspaceId))
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    await database
      .update(vercel_connections)
      .set({
        token_ciphertext: sealed.ciphertext,
        token_iv: sealed.iv,
        token_auth_tag: sealed.authTag,
        token_key_version: sealed.keyVersion,
        token_last4: last4,
        account_label: user.username,
        team_id: cleanTeamId,
        status: "active",
        validated_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(vercel_connections.id, existing[0].id));
  } else {
    await database.insert(vercel_connections).values({
      id: newId("vcn"),
      workspace_id: ctx.workspaceId,
      token_ciphertext: sealed.ciphertext,
      token_iv: sealed.iv,
      token_auth_tag: sealed.authTag,
      token_key_version: sealed.keyVersion,
      token_last4: last4,
      account_label: user.username,
      team_id: cleanTeamId,
      status: "active",
      validated_at: new Date(),
    });
  }

  return {
    connected: true,
    accountLabel: user.username,
    last4,
  };
}

export async function disconnectVercel(ctx: ServiceContext): Promise<void> {
  const database = db();
  await database
    .delete(vercel_connections)
    .where(eq(vercel_connections.workspace_id, ctx.workspaceId));
}

export async function getVercelClientForWorkspace(ctx: ServiceContext) {
  const database = db();
  const rows = await database
    .select()
    .from(vercel_connections)
    .where(eq(vercel_connections.workspace_id, ctx.workspaceId))
    .limit(1);

  if (rows.length === 0 || !rows[0]) {
    throw new AppError("NOT_FOUND", "Vercel is not connected in this workspace", {
      reason: "VERCEL_NOT_FOUND",
    });
  }

  const conn = rows[0];
  const aad = `${ctx.workspaceId}:vercel`;
  const token = await openWith(aad, {
    ciphertext: conn.token_ciphertext,
    iv: conn.token_iv,
    authTag: conn.token_auth_tag,
    keyVersion: conn.token_key_version,
  });

  return vercelClient({ token, teamId: conn.team_id });
}

export async function listVercelProjects(ctx: ServiceContext): Promise<VercelProject[]> {
  const client = await getVercelClientForWorkspace(ctx);
  return client.listProjects();
}
