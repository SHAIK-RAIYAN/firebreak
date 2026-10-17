import type { Analysis } from "./schema.js";

export interface SanitizeContext {
  validSuspectIds: string[];
  validEvidenceIds: string[];
  rankOneSuspectId?: string | null;
  serviceRepo?: { owner: string; name: string };
}

export function sanitizeAnalysis(raw: Analysis, ctx: SanitizeContext): Analysis {
  const result: Analysis = {
    summary: raw.summary,
    likelyCause: {
      suspectId: raw.likelyCause.suspectId,
      explanation: raw.likelyCause.explanation,
      evidenceIds: [...raw.likelyCause.evidenceIds],
    },
    confidence: raw.confidence,
    fixSuggestions: raw.fixSuggestions.map((f) => ({ ...f })),
    rollbackAssessment: { ...raw.rollbackAssessment },
    unknowns: [...raw.unknowns],
  };

  // 1. suspectId not in input ids -> null + low confidence + unknown
  if (
    result.likelyCause.suspectId &&
    !ctx.validSuspectIds.includes(result.likelyCause.suspectId)
  ) {
    result.likelyCause.suspectId = null;
    result.confidence = "low";
    if (!result.unknowns.includes("Model referenced an unknown commit")) {
      result.unknowns.push("Model referenced an unknown commit");
    }
  }

  // 2. Drop evidenceIds not present in input
  result.likelyCause.evidenceIds = result.likelyCause.evidenceIds.filter((id) =>
    ctx.validEvidenceIds.includes(id),
  );

  // 3. If suspectId != rank-1 suspect and confidence = "high" -> downgrade to "medium"
  if (
    result.likelyCause.suspectId &&
    ctx.rankOneSuspectId &&
    result.likelyCause.suspectId !== ctx.rankOneSuspectId &&
    result.confidence === "high"
  ) {
    result.confidence = "medium";
  }

  // 4. Strip URLs not pointing at github.com/<owner>/<repo>
  if (ctx.serviceRepo) {
    const allowedPrefix = `https://github.com/${ctx.serviceRepo.owner}/${ctx.serviceRepo.name}`;
    const urlRegex = /https?:\/\/[^\s"'<>]+/g;

    const sanitizeString = (str: string): string => {
      return str.replace(urlRegex, (url) => {
        if (url.startsWith(allowedPrefix)) {
          return url;
        }
        return "[redacted url]";
      });
    };

    result.summary = sanitizeString(result.summary);
    result.likelyCause.explanation = sanitizeString(result.likelyCause.explanation);
    result.rollbackAssessment.reason = sanitizeString(result.rollbackAssessment.reason);
    result.unknowns = result.unknowns.map(sanitizeString);
    result.fixSuggestions = result.fixSuggestions.map((f) => ({
      ...f,
      title: sanitizeString(f.title),
      description: sanitizeString(f.description),
      patch: f.patch ? sanitizeString(f.patch) : null,
    }));
  }

  return result;
}
