import type { CommitInput, Frame } from "../../src/domain/ranking.js";

/**
 * Real unified diff for the demo breaking commit per doc 03 §6.5 and doc 11.
 * Notice the hunk header says `export function subtotalCents(items)` while
 * `applyDiscount` is an enclosing context line / declaration in the hunk.
 */
export const demoBadPatch = `@@ -15,7 +15,10 @@ export function subtotalCents(items) {
   const discount = applyDiscount(items);
+  const total = items.reduce((acc, item) => acc + item.price, 0);
+  return total - discount;
 }`;

export const demoCommits: CommitInput[] = [
  // Commit 0 (newest, i=0, recency=5, innocent doc tweak)
  {
    sha: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e",
    message: "docs: update API documentation endpoints",
    authorLogin: "alice",
    authorName: "Alice Dev",
    committedAt: "2026-10-17T12:00:00Z",
    htmlUrl: "https://github.com/example/demo/commit/a1b2c3d",
    parents: 1,
    files: [
      {
        path: "README.md",
        status: "modified",
        additions: 10,
        deletions: 2,
        patch: `@@ -1,5 +1,7 @@
 # Demo API
+See /api/health for uptime monitoring.`,
      },
    ],
  },
  // Commit 1 (i=1, recency=4: the BAD commit with applyDiscount / pricing.ts)
  {
    sha: "9f1c2e7b8a9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
    message: "refactor: support stacked discounts",
    authorLogin: "bob",
    authorName: "Bob Engineer",
    committedAt: "2026-10-17T11:45:00Z",
    htmlUrl: "https://github.com/example/demo/commit/9f1c2e7",
    parents: 1,
    files: [
      {
        path: "lib/pricing.ts",
        status: "modified",
        additions: 3,
        deletions: 0,
        patch: demoBadPatch,
      },
    ],
  },
  // Commit 2 (i=2, recency=3, innocent CSS change)
  {
    sha: "1234567890abcdef1234567890abcdef12345678",
    message: "style: adjust padding on header buttons",
    authorLogin: "carol",
    authorName: "Carol Designer",
    committedAt: "2026-10-17T10:30:00Z",
    htmlUrl: "https://github.com/example/demo/commit/1234567",
    parents: 1,
    files: [
      {
        path: "src/styles.css",
        status: "modified",
        additions: 4,
        deletions: 4,
        patch: `@@ -20,4 +20,4 @@
-.btn { padding: 8px; }
+.btn { padding: 12px; }`,
      },
    ],
  },
];

export const demoFrames: Frame[] = [
  {
    file: "lib/pricing.ts",
    line: null,
    function: "applyDiscount",
    source: "hint",
  },
];

export const demoErrorMessage =
  "TypeError: Cannot read properties of undefined (reading 'reduce')";
