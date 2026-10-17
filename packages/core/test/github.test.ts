import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import * as ghModule from "../src/adapters/github.js";
import { AppError } from "../src/domain/errors.js";

describe("GitHub adapter (githubForInstallation)", () => {
  beforeEach(() => {
    process.env.GITHUB_APP_ID = "12345";
    process.env.GITHUB_APP_PRIVATE_KEY = "fake-private-key";
    process.env.GITHUB_WEBHOOK_SECRET = "fake-secret";
  });

  afterEach(() => {
    ghModule.setGithubApp(null);
    vi.restoreAllMocks();
  });

  it("reverses commits to newest-first and truncates to 20", async () => {
    const mockRequest = vi.fn().mockImplementation(async (route: string) => {
      if (route.startsWith("GET /repos/{owner}/{repo}/compare")) {
        // Return 25 commits in chronological order (oldest first: 1 to 25)
        const commits = Array.from({ length: 25 }, (_, i) => ({
          sha: `sha_${i + 1}`,
          commit: {
            message: `Commit ${i + 1}`,
            author: { name: `Author ${i + 1}`, date: new Date(1700000000000 + i * 1000).toISOString() },
          },
          author: { login: `user_${i + 1}` },
          html_url: `https://github.com/org/repo/commit/sha_${i + 1}`,
          parents: [{ sha: "parent" }],
        }));

        return {
          data: {
            status: "ahead",
            commits,
          },
        };
      }
      return { data: {} };
    });

    ghModule.setGithubApp({
      getInstallationOctokit: vi.fn().mockResolvedValue({
        request: mockRequest,
      }),
      octokit: {
        request: mockRequest,
      },
    } as any);

    const client = await ghModule.githubForInstallation(123);
    const res = await client.compare("my-org", "my-repo", "base_sha", "head_sha");

    expect(res.truncated).toBe(true);
    expect(res.commits).toHaveLength(20);
    // Newest commit (sha_25) must be first!
    expect(res.commits[0]?.sha).toBe("sha_25");
    expect(res.commits[19]?.sha).toBe("sha_6");
  });

  it("maps 404 to GITHUB_NOT_FOUND", async () => {
    const error404: any = new Error("Not Found");
    error404.status = 404;

    const mockRequest = vi.fn().mockRejectedValue(error404);
    ghModule.setGithubApp({
      getInstallationOctokit: vi.fn().mockResolvedValue({
        request: mockRequest,
      }),
    } as any);

    const client = await ghModule.githubForInstallation(123);
    await expect(client.getRepo("owner", "repo")).rejects.toSatisfy((err: any) => {
      return err instanceof AppError && err.code === "NOT_FOUND" && err.details?.reason === "GITHUB_NOT_FOUND";
    });
  });

  it("maps 401/403 to GITHUB_FORBIDDEN", async () => {
    const error403: any = new Error("Resource not accessible by integration");
    error403.status = 403;

    const mockRequest = vi.fn().mockRejectedValue(error403);
    ghModule.setGithubApp({
      getInstallationOctokit: vi.fn().mockResolvedValue({
        request: mockRequest,
      }),
    } as any);

    const client = await ghModule.githubForInstallation(123);
    await expect(client.getRepo("owner", "repo")).rejects.toSatisfy((err: any) => {
      return err instanceof AppError && err.code === "FORBIDDEN" && err.details?.reason === "GITHUB_FORBIDDEN";
    });
  });
});
