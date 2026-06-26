import type { Config } from "../config/schema.js";
import type { ChangedFile } from "../github/types.js";
import type { ReviewProvider } from "../llm/provider.js";
import { buildSystemPrompt, buildUserPrompt } from "../prompts/review-prompt.js";
import { meetsThreshold, type Finding } from "../schemas/index.js";
import { assessRisk, renderSummaryComment, type RiskAssessment } from "./risk.js";

export interface ReviewResult {
  findings: Finding[];
  risk: RiskAssessment;
  summaryMarkdown: string;
  /** True if there was nothing in scope to review. */
  skipped: boolean;
}

/**
 * Core Phase-1 pipeline (pure of GitHub I/O so it's easy to unit-test and
 * dry-run): build prompts from the diff, call the LLM, filter findings by the
 * configured severity threshold, score risk, and render the summary markdown.
 */
export async function runReview(args: {
  provider: ReviewProvider;
  config: Config;
  files: ChangedFile[];
  meta: { title?: string; body?: string };
}): Promise<ReviewResult> {
  const { provider, config, files, meta } = args;

  if (files.length === 0) {
    const risk = assessRisk([]);
    return {
      findings: [],
      risk,
      skipped: true,
      summaryMarkdown: renderSummaryComment({
        findings: [],
        summary: "No reviewable files changed in this PR.",
        risk,
        model: config.model,
      }),
    };
  }

  const response = await provider.review({
    systemPrompt: buildSystemPrompt(config),
    userPrompt: buildUserPrompt(files, meta),
  });

  // Drop findings below the configured threshold, and any whose category is
  // for a disabled check (defends against the model ignoring instructions).
  const findings = response.findings
    .filter((f) => meetsThreshold(f.severity, config.severity_threshold))
    .filter((f) => isCategoryEnabled(f.category, config))
    .slice(0, config.max_comments);

  const risk = assessRisk(findings);

  return {
    findings,
    risk,
    skipped: false,
    summaryMarkdown: renderSummaryComment({
      findings,
      summary: response.summary,
      risk,
      model: config.model,
    }),
  };
}

function isCategoryEnabled(category: Finding["category"], config: Config): boolean {
  switch (category) {
    case "security":
      return config.checks.security;
    case "quality":
      return config.checks.code_quality;
    case "coverage":
      return config.checks.test_coverage;
    default:
      return true;
  }
}
