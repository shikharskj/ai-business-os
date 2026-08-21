import { sanitizeUntrustedText } from "@/modules/ai/domain/untrusted-content";

const RECOMMENDATION_LINE = /^\s*(?:[-*•]\s*)?recommendations?\s*[:\-—]\s*/i;
const FACT_LINE = /^\s*(?:[-*•]\s*)?facts?\s*[:\-—]\s*/i;

/**
 * A currency symbol or a two-decimal figure in model prose. Used only to warn
 * when the model quotes numbers that no tool produced — never to validate a
 * grounded answer.
 */
const FIGURE = /(?:₹|\bINR\b|\bRs\.?\b)\s*[\d,]+(?:\.\d+)?|\b\d[\d,]*\.\d{2}\b/i;

export type AssistantAnswerParts = {
  analysis: string;
  recommendations: string[];
};

/**
 * Splits model text into analysis prose and recommendations.
 *
 * The policy asks the model to label lines `FACT:` / `RECOMMENDATION:`. Those
 * labels are a presentation hint only: nothing here can promote model text into
 * the verified-data section, which is built from tool output alone.
 */
export function splitAssistantAnswer(text: string): AssistantAnswerParts {
  const safe = sanitizeUntrustedText(text).trim();
  if (safe === "") {
    return { analysis: "", recommendations: [] };
  }

  const analysisLines: string[] = [];
  const recommendations: string[] = [];

  for (const line of safe.split("\n")) {
    if (RECOMMENDATION_LINE.test(line)) {
      const body = line.replace(RECOMMENDATION_LINE, "").trim();
      if (body !== "") {
        recommendations.push(body);
      }
      continue;
    }
    analysisLines.push(line.replace(FACT_LINE, ""));
  }

  return {
    analysis: analysisLines.join("\n").trim(),
    recommendations,
  };
}

/** True when prose quotes money-like figures. */
export function containsFigures(text: string): boolean {
  return FIGURE.test(text);
}
