import { describe, it, expect } from "vitest";
import { rankSuspects, type Frame, type CommitInput } from "../src/domain/ranking.js";
import {
  demoCommits,
  demoFrames,
  demoErrorMessage,
} from "./fixtures/demo.js";

describe("rankSuspects", () => {
  // Case 1: Demo case (doc 03 §6.5 item 1)
  it("scores the demo breaking commit at exactly 79 points and rank #1", () => {
    const result = rankSuspects({
      commits: demoCommits,
      frames: demoFrames,
      errorMessage: demoErrorMessage,
    });

    expect(result.confidence).toBe("high");
    expect(result.suspects.length).toBe(3);

    const top = result.suspects[0]!;
    expect(top.sha).toBe("9f1c2e7b8a9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e");
    expect(top.rank).toBe(1);
    expect(top.points).toBe(79); // 40 (exact) + 25 (symbol) + 10 (reduce token) + 4 (recency)
    expect(top.score).toBe(0.79);

    const kinds = top.evidence.map((e) => e.kind);
    expect(kinds).toContain("file_exact");
    expect(kinds).toContain("symbol");
    expect(kinds).toContain("error_token");
    expect(kinds).toContain("recency");
  });

  // Case 2: Bundled-only frames and no hint (doc 03 §6.5 item 2)
  it("falls back to recency and risky files when only minified/bundled frames exist", () => {
    const minifiedFrames: Frame[] = [
      {
        file: "/var/task/.next/server/chunks/412.js",
        line: 12,
        function: "a",
        source: "stack",
      },
    ];

    const commits: CommitInput[] = [
      {
        sha: "commit_config_change",
        message: "chore: update next config",
        authorLogin: "dev",
        authorName: "Dev",
        committedAt: "2026-10-17T12:00:00Z",
        htmlUrl: "https://github.com/example/demo/commit/1",
        parents: 1,
        files: [
          {
            path: "next.config.ts",
            status: "modified",
            additions: 1,
            deletions: 0,
            patch: `@@ -1,2 +1,3 @@
+// config change`,
          },
        ],
      },
    ];

    const result = rankSuspects({
      commits,
      frames: minifiedFrames,
      errorMessage: "Something failed",
    });

    expect(result.confidence).toBe("low");
    const top = result.suspects[0]!;
    expect(top.points).toBe(13); // 8 (risky_file next.config.ts) + 5 (recency i=0)
  });

  // Case 3: Suffix match (doc 03 §6.5 item 3)
  it("scores path suffix matches with +30 points", () => {
    const frames: Frame[] = [
      {
        file: "/vercel/path0/src/lib/pricing.ts",
        line: 10,
        function: null,
        source: "stack",
      },
    ];

    const commits: CommitInput[] = [
      {
        sha: "sha_suffix_match",
        message: "fix: update pricing",
        authorLogin: "dev",
        authorName: "Dev",
        committedAt: "2026-10-17T12:00:00Z",
        htmlUrl: "https://github.com/example/demo/commit/suffix",
        parents: 1,
        files: [
          {
            path: "src/lib/pricing.ts",
            status: "modified",
            additions: 1,
            deletions: 0,
            patch: `@@ -1,2 +1,3 @@
+// change`,
          },
        ],
      },
    ];

    const result = rankSuspects({
      commits,
      frames,
      errorMessage: null,
    });

    const top = result.suspects[0]!;
    const suffixEvidence = top.evidence.find((e) => e.kind === "file_suffix");
    expect(suffixEvidence).toBeDefined();
    expect(suffixEvidence?.points).toBe(30);
  });

  // Case 4: Line in hunk (doc 03 §6.5 item 4)
  it("scores +25 for stack frame line within hunk range ± 3", () => {
    const frames: Frame[] = [
      {
        file: "src/calculator.ts",
        line: 47,
        function: null,
        source: "stack",
      },
    ];

    const commits: CommitInput[] = [
      {
        sha: "sha_line_in_hunk",
        message: "feat: add calculate function",
        authorLogin: "dev",
        authorName: "Dev",
        committedAt: "2026-10-17T12:00:00Z",
        htmlUrl: "https://github.com/example/demo/commit/calc",
        parents: 1,
        files: [
          {
            path: "src/calculator.ts",
            status: "modified",
            additions: 12,
            deletions: 0,
            patch: `@@ -40,12 +40,12 @@
+function calculate() {}`,
          },
        ],
      },
    ];

    const result = rankSuspects({
      commits,
      frames,
      errorMessage: null,
    });

    const top = result.suspects[0]!;
    const lineEvidence = top.evidence.find((e) => e.kind === "line_in_hunk");
    expect(lineEvidence).toBeDefined();
    expect(lineEvidence?.points).toBe(25);
  });

  // Case 5: Merge commit gets 0 (doc 03 §6.5 item 5)
  it("assigns 0 points to merge commits (parents > 1)", () => {
    const commits: CommitInput[] = [
      {
        sha: "merge_sha",
        message: "Merge pull request #42 from feature",
        authorLogin: "dev",
        authorName: "Dev",
        committedAt: "2026-10-17T12:00:00Z",
        htmlUrl: "https://github.com/example/demo/commit/merge",
        parents: 2,
        files: [
          {
            path: "lib/pricing.ts",
            status: "modified",
            additions: 10,
            deletions: 0,
            patch: `@@ -1,5 +1,10 @@`,
          },
        ],
      },
    ];

    const result = rankSuspects({
      commits,
      frames: demoFrames,
      errorMessage: null,
    });

    expect(result.suspects[0]!.points).toBe(0);
  });

  // Case 6: Determinism: shuffled input order produces identical ranking (doc 03 §6.5 item 6)
  it("produces identical ranked results regardless of input order", () => {
    const r1 = rankSuspects({
      commits: demoCommits,
      frames: demoFrames,
      errorMessage: demoErrorMessage,
    });

    // Reversed commits
    const reversed = [...demoCommits].reverse();
    const r2 = rankSuspects({
      commits: reversed,
      frames: demoFrames,
      errorMessage: demoErrorMessage,
    });

    expect(r1.suspects.map((s) => s.sha)).toEqual(r2.suspects.map((s) => s.sha));
    expect(r1.suspects.map((s) => s.points)).toEqual(r2.suspects.map((s) => s.points));
  });

  // Case 7: Ties broken by committedAt then sha (doc 03 §6.5 item 7)
  it("breaks score ties by committedAt desc, then sha asc", () => {
    const commits: CommitInput[] = [
      {
        sha: "zzz_sha",
        message: "merge branch z",
        authorLogin: "dev",
        authorName: "Dev",
        committedAt: "2026-10-17T10:00:00Z",
        htmlUrl: "https://github.com/example/demo/commit/z",
        parents: 2, // 0 points
        files: [],
      },
      {
        sha: "aaa_sha",
        message: "merge branch a",
        authorLogin: "dev",
        authorName: "Dev",
        committedAt: "2026-10-17T10:00:00Z",
        htmlUrl: "https://github.com/example/demo/commit/a",
        parents: 2, // 0 points
        files: [],
      },
    ];

    const result = rankSuspects({
      commits,
      frames: [],
      errorMessage: null,
    });

    expect(result.suspects[0]!.sha).toBe("aaa_sha");
    expect(result.suspects[1]!.sha).toBe("zzz_sha");
  });
});
