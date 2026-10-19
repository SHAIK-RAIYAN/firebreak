import { AppError } from "../domain/errors.js";
import { withRetry } from "../util/retry.js";
import { logger } from "../util/logger.js";

export interface VercelClientOptions {
  token: string;
  teamId?: string | null;
  baseUrl?: string;
}

import type { DeploymentRef } from "../db/schema.js";
export type { DeploymentRef };

export interface VercelProject {
  id: string;
  name: string;
  framework?: string | null;
  link?: {
    type: string;
    org?: string;
    repo?: string;
    repoId?: number;
    productionBranch?: string;
  } | null;
  productionUrl?: string | null;
}

export interface AliasJob {
  type: "promote" | "rollback";
  jobStatus: "pending" | "in-progress" | "succeeded" | "failed" | "skipped";
  fromDeploymentId?: string;
  toDeploymentId?: string;
  requestedAt?: number;
}

export interface VercelProjectDetail extends VercelProject {
  targets?: {
    production?: {
      id?: string;
      url?: string;
    };
  };
  lastAliasRequest?: AliasJob | null;
  lastRollbackTarget?: string | null;
}

interface RawDeployment {
  uid?: string;
  id?: string;
  url?: string;
  state?: string;
  readyState?: string;
  created?: number;
  createdAt?: string | number;
  meta?: {
    githubCommitSha?: string;
    githubCommitRef?: string;
    githubCommitMessage?: string;
  };
}

function mapRawDeployment(raw: RawDeployment): DeploymentRef {
  const id = raw.id ?? raw.uid ?? "";
  const rawUrl = raw.url ?? "";
  const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const createdMs = raw.created ?? (typeof raw.createdAt === "number" ? raw.createdAt : raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now());
  const createdAt = new Date(createdMs).toISOString();
  const sha = raw.meta?.githubCommitSha ?? null;
  const branch = raw.meta?.githubCommitRef ?? null;
  const state = raw.readyState ?? raw.state ?? "READY";

  return {
    id,
    uid: id,
    url,
    sha,
    createdAt,
    created: createdMs,
    state,
    branch,
  };
}

export function vercelClient(opts: VercelClientOptions) {
  const baseUrl = opts.baseUrl ?? "https://api.vercel.com";
  const token = opts.token.trim();
  const teamId = opts.teamId?.trim() || null;

  async function request<T>(
    endpoint: string,
    init: RequestInit = {},
    options: { timeoutMs?: number; skipRetry?: boolean } = {},
  ): Promise<{ status: number; data: T }> {
    const isWrite = init.method && init.method !== "GET" && init.method !== "HEAD";
    const timeoutMs = options.timeoutMs ?? (isWrite ? 15000 : 8000);

    const url = new URL(endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`);
    if (teamId && !url.searchParams.has("teamId")) {
      url.searchParams.set("teamId", teamId);
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const doFetch = async () => {
      let res: Response;
      try {
        res = await fetch(url.toString(), {
          ...init,
          headers,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        throw new AppError("UPSTREAM_ERROR", `Vercel network error: ${(err as Error).message}`, {
          reason: "VERCEL_UNAVAILABLE",
          provider: "vercel",
        });
      }

      if (!res.ok) {
        let errorData: any = {};
        try {
          errorData = await res.json();
        } catch {
          // Response body not JSON
        }

        const vercelMessage = errorData?.error?.message ?? res.statusText;
        const status = res.status;

        if (status === 401 || status === 403) {
          throw new AppError("UPSTREAM_ERROR", `Vercel authorization failed: ${vercelMessage}`, {
            reason: "VERCEL_UNAUTHORIZED",
            provider: "vercel",
            vercelMessage,
          });
        }
        if (status === 402) {
          throw new AppError("UPSTREAM_ERROR", `Vercel plan limit: ${vercelMessage}`, {
            reason: "VERCEL_PLAN_LIMIT",
            provider: "vercel",
            vercelMessage,
          });
        }
        if (status === 404) {
          throw new AppError("NOT_FOUND", `Vercel resource not found: ${vercelMessage}`, {
            reason: "VERCEL_NOT_FOUND",
            provider: "vercel",
            vercelMessage,
          });
        }
        if (status === 409) {
          throw new AppError("CONFLICT", `Vercel conflict: ${vercelMessage}`, {
            reason: "VERCEL_CONFLICT",
            provider: "vercel",
            vercelMessage,
          });
        }
        if (status === 422) {
          throw new AppError("UPSTREAM_ERROR", `Vercel rejected request: ${vercelMessage}`, {
            reason: "VERCEL_REJECTED",
            provider: "vercel",
            vercelMessage,
          });
        }
        if (status === 429 || status >= 500) {
          const retryAfter = res.headers.get("retry-after");
          throw new AppError("UPSTREAM_ERROR", `Vercel unavailable (${status}): ${vercelMessage}`, {
            reason: "VERCEL_UNAVAILABLE",
            provider: "vercel",
            vercelMessage,
            retryAfter: retryAfter ? Number(retryAfter) : undefined,
          });
        }

        throw new AppError("UPSTREAM_ERROR", `Vercel API error (${status}): ${vercelMessage}`, {
          reason: "VERCEL_UNAVAILABLE",
          provider: "vercel",
          vercelMessage,
        });
      }

      let data: T;
      if (res.status === 204) {
        data = {} as T;
      } else {
        try {
          data = (await res.json()) as T;
        } catch {
          data = {} as T;
        }
      }

      return { status: res.status, data };
    };

    if (options.skipRetry) {
      return doFetch();
    }

    return withRetry(doFetch, {
      retries: 2,
      baseMs: 300,
      maxMs: 3000,
      retryOn: (err) => {
        if (err instanceof AppError) {
          const reason = err.details?.reason;
          return reason === "VERCEL_UNAVAILABLE" || reason === "VERCEL_CONFLICT";
        }
        return false;
      },
    });
  }

  return {
    async getUser(): Promise<{ username: string }> {
      const { data } = await request<{ user: { username: string } }>("/v2/user");
      return { username: data.user.username };
    },

    async listProjects(): Promise<VercelProject[]> {
      const { data } = await request<{ projects: VercelProject[] }>("/v9/projects?limit=100");
      return data.projects || [];
    },

    async getProject(projectId: string): Promise<VercelProjectDetail> {
      const { data } = await request<VercelProjectDetail>(`/v9/projects/${encodeURIComponent(projectId)}`);
      return data;
    },

    async getDeployment(id: string): Promise<DeploymentRef> {
      const { data } = await request<RawDeployment>(`/v13/deployments/${encodeURIComponent(id)}`);
      return mapRawDeployment(data);
    },

    async listProductionDeployments(
      projectId: string,
      options: { rollbackCandidate?: boolean; limit?: number } = {},
    ): Promise<DeploymentRef[]> {
      const limit = options.limit ?? 20;
      let endpoint = `/v7/deployments?projectId=${encodeURIComponent(projectId)}&target=production&state=READY&limit=${limit}`;
      if (options.rollbackCandidate) {
        endpoint += "&rollbackCandidate=true";
      }
      const { data } = await request<{ deployments: RawDeployment[] }>(endpoint);
      return (data.deployments || []).map(mapRawDeployment);
    },

    async getCurrentProduction(projectId: string): Promise<DeploymentRef> {
      const project = await this.getProject(projectId);

      // Branch 1: targets.production.id
      if (project.targets?.production?.id) {
        logger.debug({ projectId, branch: "targets.production.id", depId: project.targets.production.id }, "Resolved production deployment");
        return this.getDeployment(project.targets.production.id);
      }

      // Branch 2: lastAliasRequest?.jobStatus === "succeeded"
      if (project.lastAliasRequest?.jobStatus === "succeeded" && project.lastAliasRequest.toDeploymentId) {
        logger.debug({ projectId, branch: "lastAliasRequest.toDeploymentId", depId: project.lastAliasRequest.toDeploymentId }, "Resolved production deployment");
        return this.getDeployment(project.lastAliasRequest.toDeploymentId);
      }

      // Branch 3: Newest ready production deployment
      logger.debug({ projectId, branch: "newest_ready" }, "Resolving production deployment from ready list");
      const list = await this.listProductionDeployments(projectId, { limit: 1 });
      if (list[0]) {
        return list[0];
      }

      throw new AppError("NOT_FOUND", `No production deployment found for Vercel project ${projectId}`, {
        reason: "VERCEL_NOT_FOUND",
      });
    },

    async getRollbackTarget(
      projectId: string,
      bad: DeploymentRef,
      knownBadIds: string[] = [],
    ): Promise<DeploymentRef | null> {
      const candidates = await this.listProductionDeployments(projectId, {
        rollbackCandidate: true,
        limit: 20,
      });

      const badCreated = bad.created ?? new Date(bad.createdAt).getTime();

      for (const dep of candidates) {
        const depCreated = dep.created ?? new Date(dep.createdAt).getTime();

        // Must be older than the bad deployment
        if (depCreated >= badCreated) continue;

        // Must not have identical commit SHA
        if (dep.sha && bad.sha && dep.sha === bad.sha) continue;

        // Must not be the same deployment ID
        if (dep.id === bad.id) continue;

        // Must not be in known-bad list
        if (knownBadIds.includes(dep.id)) continue;

        return dep;
      }

      return null;
    },

    async rollback(
      projectId: string,
      deploymentId: string,
      description?: string,
    ): Promise<{ status: number; body: unknown }> {
      const descQuery = description ? `?description=${encodeURIComponent(description)}` : "";
      const endpoint = `/v1/projects/${encodeURIComponent(projectId)}/rollback/${encodeURIComponent(deploymentId)}${descQuery}`;

      // CRITICAL RULE: Never retry rollback() automatically inside the adapter!
      try {
        const res = await request<unknown>(
          endpoint,
          {
            method: "POST",
          },
          { skipRetry: true },
        );
        return { status: res.status, body: res.data };
      } catch (err: any) {
        // Vercel Hobby accounts reject rollbacks older than 1 deployment with 402 VERCEL_PLAN_LIMIT.
        // Fall back gracefully to POST /v10/projects/:id/promote/:deploymentId which works on all tiers!
        const reason = err?.details?.reason ?? err?.code;
        const msg = String(err?.message ?? "");
        if (
          reason === "VERCEL_PLAN_LIMIT" ||
          msg.includes("Vercel plan limit") ||
          msg.includes("upgrade to pro")
        ) {
          const promoteRes = await this.promote(projectId, deploymentId);
          return {
            status: promoteRes.status,
            body: {
              promoted: true,
              targetDeploymentId: deploymentId,
              fallback: "promote",
              note: "Fell back to atomic promotion because project is on Vercel Hobby plan",
            },
          };
        }
        throw err;
      }
    },

    async promote(projectId: string, deploymentId: string): Promise<{ status: number }> {
      const endpoint = `/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(deploymentId)}`;
      const res = await request<unknown>(endpoint, { method: "POST" });
      return { status: res.status };
    },

    async getAliasJob(projectId: string): Promise<AliasJob | null> {
      const project = await this.getProject(projectId);
      return project.lastAliasRequest ?? null;
    },
  };
}
