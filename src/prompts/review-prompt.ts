import type { Config } from "../config/schema.js";
import type { ChangedFile } from "../github/types.js";

/**
 * Rough character budget for the diff we send to the model. We target ~8k tokens
 * of diff per the PRD; ~4 chars/token => ~32k chars. Kept conservative to leave
 * headroom for the system prompt and the model's JSON response.
 */
const MAX_DIFF_CHARS = 28_000;

/**
 * System prompt. Distilled from PR_REVIEW_EXPERT.md (the "basic" reviewer
 * persona), but hard-constrained to emit ONLY schema-valid JSON so the output
 * can be validated and posted deterministically.
 */
export function buildSystemPrompt(config: Config): string {
  const enabled = [
    config.checks.security && "security (OWASP Top 10 surface, hardcoded secrets, injection, SSRF, auth gaps)",
    config.checks.code_quality && "code quality (logic bugs, null/undefined handling, type safety, naming, duplication)",
    config.checks.test_coverage && "test coverage (new/changed exported functions lacking tests)",
  ].filter(Boolean) as string[];

  return [
    "You are a Principal Software Architect performing a precise, evidence-based pull request review.",
    "You review ONLY the changed code shown in the unified diff. Do not invent issues in code you cannot see.",
    "",
    "Focus areas for this review:",
    ...enabled.map((e) => `- ${e}`),
    "",
    "Rules:",
    "- Every finding must point to a real problem in the diff with a concrete reason it matters.",
    "- Prefer precision over volume. Do not report style nitpicks unless they cause bugs.",
    "- Assign severity honestly: 'critical' = security/data-loss; 'high' = likely bug or missing error handling; 'medium' = quality/coverage; 'info' = optional.",
    "- 'file' must be the exact path from the diff. 'line' is the 1-based line number in the NEW file when you can determine it, otherwise null.",
    "- For 'critical' and 'high' findings where a concrete fix is obvious, include a 'suggestion' containing ONLY the replacement code (no markdown fences).",
    "",
    "Output: respond with a SINGLE JSON object and nothing else, matching exactly:",
    "{",
    '  "summary": string,   // one short paragraph on the overall health of the change',
    '  "findings": [',
    "    {",
    '      "category": "security" | "quality" | "coverage",',
    '      "severity": "info" | "medium" | "high" | "critical",',
    '      "file": string,',
    '      "line": number | null,',
    '      "title": string,',
    '      "description": string,',
    '      "suggestion": string | null',
    "    }",
    "  ]",
    "}",
    "Do not wrap the JSON in markdown. Do not add commentary before or after it.",
  ].join("\n");
}

/** Builds the user prompt: PR metadata + the (possibly truncated) diff. */
export function buildUserPrompt(
  files: ChangedFile[],
  meta: { title?: string; body?: string },
): string {
  const header = [
    meta.title ? `PR title: ${meta.title}` : null,
    meta.body ? `PR description:\n${truncate(meta.body, 1_000)}` : null,
    `Changed files: ${files.length}`,
    "",
    "Unified diff of changed files (review these):",
  ]
    .filter(Boolean)
    .join("\n");

  const diff = renderDiff(files);
  return `${header}\n\n${diff}`;
}

/** Concatenates per-file patches into a single bounded diff string. */
function renderDiff(files: ChangedFile[]): string {
  const blocks: string[] = [];
  let used = 0;

  for (const file of files) {
    if (!file.patch) {
      blocks.push(`### ${file.filename}\n(no textual diff available — binary or too large)`);
      continue;
    }
    const block = `### ${file.filename} (+${file.additions} / -${file.deletions})\n${file.patch}`;
    if (used + block.length > MAX_DIFF_CHARS) {
      const remaining = MAX_DIFF_CHARS - used;
      if (remaining > 200) {
        blocks.push(`${block.slice(0, remaining)}\n…(diff truncated to fit token budget)`);
      } else {
        blocks.push(`### ${file.filename}\n…(omitted — token budget reached)`);
      }
      break;
    }
    blocks.push(block);
    used += block.length;
  }

  return blocks.join("\n\n");
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
