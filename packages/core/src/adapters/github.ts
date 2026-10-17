import { App } from "@octokit/app";
import { AppError } from "../domain/errors.js";
import { requireEnv, optionalEnv } from "../util/env.js";
import { withRetry } from "../util/retry.js";

export interface RepoRef {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export interface CommitRef {
  sha: string;
  message: string;
  authorLogin: string | null;
  authorName: string;
  committedAt: string;
  htmlUrl: string;
  parents: number;
}

export interface CommitFile {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
  previousPath: string | null;
}

export interface CompareResult {
  status: "ahead" | "behind" | "identical" | "diverged";
  commits: CommitRef[];
  truncated: boolean;
}

export interface VerifiedInstallation {
  account: {
    login: string;
    type: string;
    id: number;
  };
  repositorySelection: "all" | "selected";
  suspendedAt: string | null;
}

let cachedApp: App | null = null;

export function setGithubApp(app: App | null) {
  cachedApp = app;
}

export function githubApp(): App {
  if (cachedApp) return cachedApp;

  const appId = requireEnv("GITHUB_APP_ID");
  const rawKey = requireEnv("GITHUB_APP_PRIVATE_KEY");
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const secret = optionalEnv("GITHUB_WEBHOOK_SECRET", "");

  cachedApp = new App({
    appId,
    privateKey,
    webhooks: {
      secret,
    },
  });

  return cachedApp;
}

function mapGithubError(err: unknown): never {
  const status = (err as any)?.status;
  const msg = (err as Error)?.message ?? "GitHub request failed";

  if (status === 401 || status === 403) {
    throw new AppError("FORBIDDEN", `GitHub access forbidden: ${msg}`, {
      reason: "GITHUB_FORBIDDEN",
      provider: "github",
    });
  }
  if (status === 404) {
    throw new AppError("NOT_FOUND", `GitHub resource not found: ${msg}`, {
      reason: "GITHUB_NOT_FOUND",
      provider: "github",
    });
  }
  if (status === 429 || (status && status >= 500)) {
    throw new AppError("UPSTREAM_ERROR", `GitHub unavailable (${status}): ${msg}`, {
      reason: "GITHUB_UNAVAILABLE",
      provider: "github",
    });
  }

  throw new AppError("UPSTREAM_ERROR", `GitHub API error: ${msg}`, {
    reason: "GITHUB_UNAVAILABLE",
    provider: "github",
  });
}

async function runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(
    async () => {
      try {
        return await fn();
      } catch (err) {
        mapGithubError(err);
      }
    },
    {
      retries: 2,
      baseMs: 300,
      maxMs: 3000,
      retryOn: (err) => {
        if (err instanceof AppError) {
          return err.details?.reason === "GITHUB_UNAVAILABLE";
        }
        return false;
      },
    },
  );
}

export async function verifyInstallation(installationId: number): Promise<VerifiedInstallation> {
  const app = githubApp();
  return runWithRetry(async () => {
    const res = await app.octokit.request("GET /app/installations/{installation_id}", {
      installation_id: installationId,
    });
    const inst = res.data;
    const account = inst.account as any;
    return {
      account: {
        login: account?.login ?? "",
        type: account?.type ?? "User",
        id: account?.id ?? 0,
      },
      repositorySelection: (inst.repository_selection as "all" | "selected") ?? "all",
      suspendedAt: inst.suspended_at ? new Date(inst.suspended_at).toISOString() : null,
    };
  });
}

export async function githubForInstallation(installationId: number) {
  const app = githubApp();
  const octokit = await app.getInstallationOctokit(installationId);

  return {
    async listRepos(): Promise<RepoRef[]> {
      return runWithRetry(async () => {
        const repos: RepoRef[] = [];
        let page = 1;
        const perPage = 100;
        const maxRepos = 300;

        while (repos.length < maxRepos) {
          const res = await octokit.request("GET /installation/repositories", {
            per_page: perPage,
            page,
          });

          const pageRepos = res.data.repositories || [];
          if (pageRepos.length === 0) break;

          for (const r of pageRepos) {
            repos.push({
              id: Number(r.id),
              owner: r.owner.login,
              name: r.name,
              fullName: r.full_name,
              defaultBranch: r.default_branch,
              private: r.private,
            });
            if (repos.length >= maxRepos) break;
          }

          if (pageRepos.length < perPage) break;
          page++;
        }

        return repos;
      });
    },

    async getRepo(owner: string, repo: string): Promise<RepoRef> {
      return runWithRetry(async () => {
        const res = await octokit.request("GET /repos/{owner}/{repo}", {
          owner,
          repo,
        });
        const r = res.data;
        return {
          id: Number(r.id),
          owner: r.owner.login,
          name: r.name,
          fullName: r.full_name,
          defaultBranch: r.default_branch,
          private: r.private,
        };
      });
    },

    async compare(
      owner: string,
      repo: string,
      base: string,
      head: string,
    ): Promise<CompareResult> {
      return runWithRetry(async () => {
        const res = await octokit.request("GET /repos/{owner}/{repo}/compare/{basehead}", {
          owner,
          repo,
          basehead: `${base}...${head}`,
        });

        const status = (res.data.status as "ahead" | "behind" | "identical" | "diverged") || "ahead";
        const rawCommits = res.data.commits || [];

        // GitHub returns commits oldest first. Reverse so they are newest first!
        const reversed = [...rawCommits].reverse();
        const truncated = reversed.length > 20;
        const newest20 = reversed.slice(0, 20);

        const commits: CommitRef[] = newest20.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          authorLogin: c.author?.login ?? null,
          authorName: c.commit.author?.name ?? "Unknown",
          committedAt: c.commit.author?.date ? new Date(c.commit.author.date).toISOString() : new Date().toISOString(),
          htmlUrl: c.html_url,
          parents: c.parents.length,
        }));

        return {
          status,
          commits,
          truncated,
        };
      });
    },

    async getCommitFiles(owner: string, repo: string, sha: string): Promise<CommitFile[]> {
      return runWithRetry(async () => {
        const res = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
          owner,
          repo,
          ref: sha,
        });

        const rawFiles = res.data.files || [];
        // Max 300 files per commit
        const capped = rawFiles.slice(0, 300);

        return capped.map((f) => ({
          path: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch ?? null,
          previousPath: (f as any).previous_filename ?? null,
        }));
      });
    },
  };
}
