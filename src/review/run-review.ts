import type { Config } from "../config/schema.js";
import type { ChangedFile } from "../github/types.js";
import type { ReviewProvider } from "../llm/provider.js";
import { AGENTS, buildAgentSystemPrompt, type Agent } from "../agents/agents.js";
import { buildUserPrompt } from "../prompts/review-prompt.js";
import { scanForSecrets } from "../scanners/secrets.js";
import { meetsThreshold, type Category, type Finding } from "../schemas/index.js";
import { mergeFindings } from "./merge.js";
import { assessRisk, renderSummaryComment, type RiskAssessment } from "./risk.js";

export interface ReviewResult {
  findings: Finding[];
  risk: RiskAssessment;
  summaryMarkdown: string;
  /** True if there was nothing in scope to review. */
  skipped: boolean;
}

/** Optional logger so the Action can surface per-agent progress without coupling
 * the pipeline to @actions/core. */
export type Logger = (message: string) => void;

/**
 * V2 multi-agent pipeline (pure of GitHub I/O so it's easy to unit-test and
 * dry-run):
 *   1. deterministic secret pre-scan (free, high-confidence)
 *   2. enabled specialized agents run in parallel (security/quality/coverage)
 *   3. merge + dedupe all findings, filter by severity threshold, score risk
 *   4. render the summary markdown
 */
export async function runReview(args: {
  provider: ReviewProvider;
  config: Config;
  files: ChangedFile[];
  meta: { title?: string; body?: string };
  log?: Logger;
}): Promise<ReviewResult> {
  const { provider, config, files, meta, log = () => {} } = args;

  if (files.length === 0) {
    return emptyResult(config, "No reviewable files changed in this PR.");
  }

  const userPrompt = buildUserPrompt(files, meta);
  const agents = AGENTS.filter((a) => config.checks[a.enabledKey]);

  // 1. Deterministic secret scan (no LLM).
  const secretFindings = config.checks.security ? scanForSecrets(files) : [];
  if (secretFindings.length) {
    log(`Secret pre-scan flagged ${secretFindings.length} potential secret(s).`);
  }

  // 2. Run enabled agents in parallel. One agent failing must not sink the rest.
  const agentResults = await Promise.allSettled(
    agents.map((agent) => runAgent(provider, agent, userPrompt)),
  );

  const agentFindings: Finding[][] = [];
  const summaries: string[] = [];
  agentResults.forEach((res, i) => {
    const agent = agents[i]!;
    if (res.status === "fulfilled") {
      agentFindings.push(res.value.findings);
      if (res.value.summary.trim()) summaries.push(res.value.summary.trim());
      log(`Agent "${agent.name}" returned ${res.value.findings.length} finding(s).`);
    } else {
      log(`Agent "${agent.name}" failed: ${errMessage(res.reason)}`);
    }
  });

  // 3. Merge + dedupe, then apply threshold + cap.
  const merged = mergeFindings([secretFindings, ...agentFindings])
    .filter((f) => meetsThreshold(f.severity, config.severity_threshold))
    .slice(0, config.max_comments);

  const risk = assessRisk(merged);

  return {
    findings: merged,
    risk,
    skipped: false,
    summaryMarkdown: renderSummaryComment({
      findings: merged,
      summary: summaries.join(" "),
      risk,
      model: config.model,
    }),
  };
}

/** Runs one agent and force-tags its findings with the agent's category so a
 * model that mislabels still lands in the right bucket. */
async function runAgent(
  provider: ReviewProvider,
  agent: Agent,
  userPrompt: string,
): Promise<{ findings: Finding[]; summary: string }> {
  const response = await provider.review({
    systemPrompt: buildAgentSystemPrompt(agent),
    userPrompt,
  });
  const findings = response.findings.map((f) => ({
    ...f,
    category: agent.category as Category,
  }));
  return { findings, summary: response.summary };
}

function emptyResult(config: Config, summary: string): ReviewResult {
  const risk = assessRisk([]);
  return {
    findings: [],
    risk,
    skipped: true,
    summaryMarkdown: renderSummaryComment({ findings: [], summary, risk, model: config.model }),
  };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
