import type { Evidence, SuspectFile } from "../db/schema.js";

export type Frame = {
  file: string;
  line: number | null;
  function: string | null;
  source: "stack" | "hint";
};

export type CommitFile = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
  previousPath?: string | null;
};

export type CommitInput = {
  sha: string;
  message: string;
  authorLogin: string | null;
  authorName: string;
  committedAt: string;
  htmlUrl: string;
  parents: number;
  files: CommitFile[];
};

export type RankInput = {
  frames: Frame[];
  errorMessage: string | null;
  commits: CommitInput[]; // newest first
};

export type RankedSuspect = {
  sha: string;
  rank: number;
  points: number;
  score: number;
  evidence: Evidence[];
  files: SuspectFile[];
};

export type ParsedHunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  addedLines: string[];
  removedLines: string[];
  contextLines: string[];
  rawLines: string[];
};

/**
 * Normalize paths from bundlers/stack traces per doc 03 §6.2.
 */
export function normalizePath(raw: string): string {
  let p = raw.replace(/\\/g, "/");

  // Remove query or hash
  p = p.split("?")[0]!.split("#")[0]!;

  // Strip common protocols / prefixes
  const prefixes = [
    "webpack-internal:///",
    "webpack:///",
    "webpack://",
    "file:///",
    "file://",
    "(rsc)/",
    "(ssr)/",
    "(app-pages-browser)/",
    "./",
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (p.startsWith(prefix)) {
        p = p.slice(prefix.length);
        changed = true;
      }
    }
  }

  // Strip leading slash
  if (p.startsWith("/")) {
    p = p.slice(1);
  }

  return p;
}

/**
 * Check if a function/symbol name is meaningful per doc 03 §6.2.
 */
export function isMeaningfulSymbol(fn: string | null | undefined): string | null {
  if (!fn) return null;

  let s = fn.trim();

  // Strip async prefix
  if (s.startsWith("async ")) {
    s = s.slice(6).trim();
  }
  // Strip Module. or Object. prefix
  if (s.startsWith("Module.")) {
    s = s.slice(7).trim();
  }
  if (s.startsWith("Object.")) {
    s = s.slice(7).trim();
  }

  // Keep last segment after dot
  if (s.includes(".")) {
    const parts = s.split(".");
    s = parts[parts.length - 1]!.trim();
  }

  // Check conditions
  if (s.length < 3) return null;
  if (s === "anonymous" || s === "<anonymous>") return null;
  if (/^[a-zA-Z_$]{1,2}$/.test(s)) return null;

  return s;
}

/**
 * Extract error tokens from error message per doc 03 §6.2.
 */
export function extractErrorTokens(errorMessage: string | null | undefined): string[] {
  if (!errorMessage) return [];

  const tokens = new Set<string>();

  // Identifiers in single or double quotes
  const quoteRegex = /['"]([A-Za-z_$][\w$]{2,})['"]/g;
  let match: RegExpExecArray | null;
  while ((match = quoteRegex.exec(errorMessage)) !== null) {
    const token = match[1];
    if (token) tokens.add(token);
  }

  // After "reading "
  const readingRegex = /reading\s+['"]?([A-Za-z_$][\w$]{2,})['"]?/gi;
  while ((match = readingRegex.exec(errorMessage)) !== null) {
    const token = match[1];
    if (token) tokens.add(token);
  }

  return Array.from(tokens);
}

/**
 * Parse unified diff patch into structured hunks per doc 03 §6.3.
 */
export function parseHunks(patch: string | null | undefined): ParsedHunk[] {
  if (!patch) return [];

  const hunks: ParsedHunk[] = [];
  const lines = patch.split("\n");

  let currentHunk: ParsedHunk | null = null;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }

      // Format: @@ -oldStart,oldLines +newStart,newLines @@ header
      const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line);
      if (match) {
        const oldStart = Number.parseInt(match[1]!, 10);
        const oldLines = match[2] ? Number.parseInt(match[2], 10) : 1;
        const newStart = Number.parseInt(match[3]!, 10);
        const newLines = match[4] ? Number.parseInt(match[4], 10) : 1;
        const header = match[5]?.trim() ?? "";

        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          header,
          addedLines: [],
          removedLines: [],
          contextLines: [],
          rawLines: [line],
        };
      } else {
        currentHunk = null;
      }
    } else if (currentHunk) {
      currentHunk.rawLines.push(line);
      if (line.startsWith("+")) {
        currentHunk.addedLines.push(line.slice(1));
      } else if (line.startsWith("-")) {
        currentHunk.removedLines.push(line.slice(1));
      } else if (line.startsWith(" ")) {
        currentHunk.contextLines.push(line.slice(1));
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}

/**
 * Check if a file matches the risky files list per doc 03 §6.4.
 */
function isRiskyFile(path: string): boolean {
  const norm = normalizePath(path);
  const base = norm.split("/").pop() ?? norm;

  if (
    base === "package.json" ||
    base === "pnpm-lock.yaml" ||
    base === "package-lock.json" ||
    base === "yarn.lock" ||
    base === "vercel.json" ||
    base.startsWith("next.config.") ||
    base.startsWith("middleware.") ||
    base.startsWith("proxy.") ||
    base.startsWith(".env") ||
    base.endsWith(".sql") ||
    norm === "prisma/schema.prisma" ||
    norm.startsWith("drizzle/")
  ) {
    return true;
  }
  return false;
}

/**
 * Check if symbol appears in a hunk as an enclosing declaration or identifier.
 */
function hunkContainsSymbol(hunk: ParsedHunk, symbol: string): boolean {
  const regex = new RegExp(`\\b${symbol}\\b`);

  // Check header
  if (regex.test(hunk.header)) return true;

  // Check added or removed lines
  for (const line of hunk.addedLines) {
    if (regex.test(line)) return true;
  }
  for (const line of hunk.removedLines) {
    if (regex.test(line)) return true;
  }
  // Check context lines
  for (const line of hunk.contextLines) {
    if (regex.test(line)) return true;
  }

  // Scan raw lines upward for enclosing declarations
  // e.g. function <name>, const <name> =, <name>(...) {, class <name>, export ... <name>
  const declRegex = new RegExp(
    `(?:function\\s+|const\\s+|let\\s+|var\\s+|class\\s+|export\\s+(?:default\\s+)?(?:function\\s+)?)${symbol}\\b|${symbol}\\s*\\(`,
  );
  for (const line of hunk.rawLines) {
    if (declRegex.test(line)) return true;
  }

  return false;
}

/**
 * Deterministic suspect ranking algorithm per doc 03 §6.
 */
export function rankSuspects(input: RankInput): {
  suspects: RankedSuspect[];
  confidence: "high" | "low";
} {
  const { frames, errorMessage, commits } = input;

  // Filter and normalize meaningful frames
  const validFrames = frames
    .map((f, idx) => ({
      index: idx + 1,
      rawFile: f.file,
      file: normalizePath(f.file),
      line: f.line,
      function: f.function,
      symbol: isMeaningfulSymbol(f.function),
      source: f.source,
    }))
    .filter(
      (f) =>
        f.file.length > 0 &&
        !f.file.includes("node_modules/") &&
        !f.file.startsWith("node:") &&
        !f.file.startsWith("internal/"),
    );

  const errorTokens = extractErrorTokens(errorMessage);

  const rankedSuspects: Array<{
    sha: string;
    points: number;
    committedAt: string;
    evidence: Evidence[];
    files: SuspectFile[];
  }> = [];

  // Ensure commits are sorted newest-first by committedAt for deterministic recency
  const sortedCommits = [...commits].sort((a, b) => {
    const timeA = new Date(a.committedAt).getTime();
    const timeB = new Date(b.committedAt).getTime();
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return a.sha.localeCompare(b.sha);
  });

  for (let commitIdx = 0; commitIdx < sortedCommits.length; commitIdx++) {
    const commit = sortedCommits[commitIdx]!;
    const evidenceList: Evidence[] = [];
    let points = 0;

    // Merge commit check: parents > 1 gets 0 points
    if (commit.parents > 1) {
      rankedSuspects.push({
        sha: commit.sha,
        points: 0,
        committedAt: commit.committedAt,
        evidence: [
          {
            id: `ev_${commit.sha}_merge`,
            kind: "recency",
            label: "Merge commit (skipped)",
            detail: "Commit has multiple parents",
            points: 0,
          },
        ],
        files: commit.files.map((f) => ({
          path: f.path,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          matched: false,
          patchExcerpt: null,
        })),
      });
      continue;
    }

    let exactFileMatches = 0;
    let suffixFileMatches = 0;
    let basenameMatches = 0;
    let lineInHunkMatched = false;
    let symbolMatched = false;
    let errorTokenMatched = false;
    let riskyFileMatched = false;

    const matchedFilesSet = new Set<string>();

    // Parse all hunks for commit files
    const parsedFiles = commit.files.map((f) => {
      const normPath = normalizePath(f.path);
      const hunks = parseHunks(f.patch);
      return { ...f, normPath, hunks };
    });

    for (const f of parsedFiles) {
      const fBasename = f.normPath.split("/").pop() ?? f.normPath;
      let fileMatchedThisFile = false;

      // 1. File matches with frames
      for (const frame of validFrames) {
        const frameBasename = frame.file.split("/").pop() ?? frame.file;
        const hintSuffix = frame.source === "hint" ? " (service hint)" : "";

        // Exact match (+40, cap 2)
        if (frame.file === f.normPath && exactFileMatches < 2) {
          exactFileMatches++;
          fileMatchedThisFile = true;
          points += 40;
          evidenceList.push({
            id: `ev_exact_${f.normPath}`,
            kind: "file_exact",
            label: `${f.normPath} matches frame #${frame.index}${hintSuffix}`,
            detail: `Exact path match with stack frame`,
            points: 40,
          });
        }
        // Suffix match (+30, cap 2)
        else if (
          exactFileMatches === 0 &&
          suffixFileMatches < 2 &&
          (frame.file.endsWith(`/${f.normPath}`) ||
            f.normPath.endsWith(`/${frame.file}`))
        ) {
          const segs1 = frame.file.split("/");
          const segs2 = f.normPath.split("/");
          // Common segments >= 2
          const common = segs1.filter((s) => segs2.includes(s));
          if (common.length >= 2) {
            suffixFileMatches++;
            fileMatchedThisFile = true;
            points += 30;
            evidenceList.push({
              id: `ev_suffix_${f.normPath}`,
              kind: "file_suffix",
              label: `${f.normPath} suffix matches frame #${frame.index}${hintSuffix}`,
              detail: `Path suffix match with >= 2 common segments`,
              points: 30,
            });
          }
        }
        // Basename only match (+10, cap 1)
        else if (
          exactFileMatches === 0 &&
          suffixFileMatches === 0 &&
          basenameMatches < 1 &&
          fBasename === frameBasename
        ) {
          basenameMatches++;
          fileMatchedThisFile = true;
          points += 10;
          evidenceList.push({
            id: `ev_base_${f.normPath}`,
            kind: "file_basename",
            label: `${f.normPath} basename matches frame #${frame.index}${hintSuffix}`,
            detail: `Basename match (${fBasename})`,
            points: 10,
          });
        }

        // Line in hunk (+25, cap 1)
        if (
          fileMatchedThisFile &&
          !lineInHunkMatched &&
          frame.line !== null &&
          frame.line !== undefined
        ) {
          for (const hunk of f.hunks) {
            const minLine = hunk.newStart - 3;
            const maxLine = hunk.newStart + hunk.newLines + 3;
            if (frame.line >= minLine && frame.line <= maxLine) {
              lineInHunkMatched = true;
              points += 25;
              evidenceList.push({
                id: `ev_line_${f.normPath}_${frame.line}`,
                kind: "line_in_hunk",
                label: `Line ${frame.line} modified in ${f.normPath}`,
                detail: `Stack line within hunk range [${hunk.newStart}, +${hunk.newLines}] ± 3`,
                points: 25,
              });
              break;
            }
          }
        }
      }

      if (fileMatchedThisFile) {
        matchedFilesSet.add(f.normPath);
      }

      // Risky file (+8, cap 1)
      if (!riskyFileMatched && isRiskyFile(f.normPath)) {
        riskyFileMatched = true;
        points += 8;
        evidenceList.push({
          id: `ev_risky_${f.normPath}`,
          kind: "risky_file",
          label: `${f.normPath} is a critical infrastructure file`,
          detail: `Configuration/schema/dependency change`,
          points: 8,
        });
      }
    }

    // Symbol matching across all files in commit (+25, cap 1)
    if (!symbolMatched) {
      for (const frame of validFrames) {
        if (!frame.symbol) continue;
        for (const f of parsedFiles) {
          for (const hunk of f.hunks) {
            if (hunkContainsSymbol(hunk, frame.symbol)) {
              symbolMatched = true;
              points += 25;
              matchedFilesSet.add(f.normPath);
              evidenceList.push({
                id: `ev_sym_${frame.symbol}`,
                kind: "symbol",
                label: `${frame.symbol} changed (frame function)`,
                detail: `Symbol '${frame.symbol}' modified in ${f.normPath}`,
                points: 25,
              });
              break;
            }
          }
          if (symbolMatched) break;
        }
        if (symbolMatched) break;
      }
    }

    // Error token matching in addedLines (+10, cap 1)
    if (!errorTokenMatched && errorTokens.length > 0) {
      for (const token of errorTokens) {
        for (const f of parsedFiles) {
          for (const hunk of f.hunks) {
            const tokenRegex = new RegExp(`\\b${token}\\b`);
            const matchedLine = hunk.addedLines.find((l) => tokenRegex.test(l));
            if (matchedLine) {
              errorTokenMatched = true;
              points += 10;
              matchedFilesSet.add(f.normPath);
              evidenceList.push({
                id: `ev_token_${token}`,
                kind: "error_token",
                label: `reads '${token}' in added line`,
                detail: `Error token '${token}' introduced in ${f.normPath}`,
                points: 10,
              });
              break;
            }
          }
          if (errorTokenMatched) break;
        }
        if (errorTokenMatched) break;
      }
    }

    // Recency (+ max(0, 5 - i))
    const recencyPoints = Math.max(0, 5 - commitIdx);
    if (recencyPoints > 0) {
      points += recencyPoints;
      evidenceList.push({
        id: `ev_recency_${commitIdx}`,
        kind: "recency",
        label: `Deployed recently (#${commitIdx + 1} in commit sequence)`,
        detail: `Recency score (+${recencyPoints})`,
        points: recencyPoints,
      });
    }

    // Build SuspectFile array
    const suspectFiles: SuspectFile[] = commit.files.map((f) => {
      const norm = normalizePath(f.path);
      const isMatched = matchedFilesSet.has(norm);
      return {
        path: f.path,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        matched: isMatched,
        patchExcerpt: isMatched && f.patch ? f.patch.slice(0, 2000) : null,
      };
    });

    rankedSuspects.push({
      sha: commit.sha,
      points,
      committedAt: commit.committedAt,
      evidence: evidenceList,
      files: suspectFiles,
    });
  }

  // Stable sort: points desc, committedAt desc, sha asc
  rankedSuspects.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    const timeA = new Date(a.committedAt).getTime();
    const timeB = new Date(b.committedAt).getTime();
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return a.sha.localeCompare(b.sha);
  });

  // Assign ranks and format deterministic evidence IDs
  const suspects: RankedSuspect[] = rankedSuspects.map((s, idx) => {
    const rank = idx + 1;
    const formattedEvidence: Evidence[] = s.evidence.map((ev, evIdx) => ({
      ...ev,
      id: `ev_${rank}_${evIdx + 1}`,
    }));

    return {
      sha: s.sha,
      rank,
      points: s.points,
      score: Math.min(1, s.points / 100),
      evidence: formattedEvidence,
      files: s.files,
    };
  });

  // Confidence is high if top suspect has any file_* or symbol evidence
  const topSuspect = suspects[0];
  const hasHighConfidenceEvidence =
    topSuspect?.evidence.some(
      (e) => e.kind.startsWith("file_") || e.kind === "symbol",
    ) ?? false;

  const confidence: "high" | "low" = hasHighConfidenceEvidence ? "high" : "low";

  return { suspects, confidence };
}
