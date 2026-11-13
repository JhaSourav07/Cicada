import { SearchSource, CitationValidationResult } from "./types";

/**
 * Regex matching citation markers in brackets, e.g. [1], [2], [1, 2], [1][2]
 */
const CITATION_MARKER_REGEX = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

/**
 * Validates inline numerical citation markers against the retrieved sources array.
 * Strips unknown/hallucinated citation markers (e.g., [99] when only 3 sources exist).
 * Returns the sanitized response text and list of active sources.
 */
export function validateCitations(
  responseText: string,
  sources: SearchSource[]
): CitationValidationResult {
  if (!sources || sources.length === 0) {
    // If no sources were retrieved, strip any hallucinated bracketed citations
    const sanitized = responseText.replace(CITATION_MARKER_REGEX, "");
    return {
      validMarkers: [],
      invalidMarkers: [],
      sanitizedContent: sanitized,
      activeSources: [],
    };
  }

  const validIdSet = new Set(sources.map((s) => s.id));
  const validFound = new Set<number>();
  const invalidFound = new Set<number>();

  const sanitizedContent = responseText.replace(
    CITATION_MARKER_REGEX,
    (fullMatch, innerNumbers: string) => {
      const numbers = innerNumbers
        .split(",")
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));

      const validForThisMatch: number[] = [];

      for (const num of numbers) {
        if (validIdSet.has(num.toString())) {
          validForThisMatch.push(num);
          validFound.add(num);
        } else {
          invalidFound.add(num);
        }
      }

      if (validForThisMatch.length === 0) {
        // Drop the hallucinated marker completely
        return "";
      }

      return `[${validForThisMatch.join(", ")}]`;
    }
  );

  // Active sources: sources that were actually cited in the generated answer
  const activeSources = sources.filter((s) => validFound.has(parseInt(s.id, 10)));

  return {
    validMarkers: Array.from(validFound).sort((a, b) => a - b),
    invalidMarkers: Array.from(invalidFound).sort((a, b) => a - b),
    sanitizedContent,
    // If model didn't cite explicitly with [N], provide all top retrieved sources as references
    activeSources: activeSources.length > 0 ? activeSources : sources,
  };
}
