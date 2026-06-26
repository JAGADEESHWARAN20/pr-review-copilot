import * as core from "@actions/core";
import * as github from "@actions/github";
import { loadConfig } from "./config/load-config.js";
import { getChangedFiles } from "./github/get-pr-diff.js";
import { upsertSummaryComment } from "./github/post-review.js";
import type { PullRequestContext } from "./github/types.js";
import { createProvider, type ProviderName } from "./llm/factory.js";
import { runReview } from "./review/run-review.js";

/** GitHub Action entry point. */
async function main(): Promise<void> {
  const githubToken = core.getInput("github-token", { required: true });
  const geminiApiKey = core.getInput("gemini-api-key");
  const providerName = (core.getInput("llm-provider") || "gemini") as ProviderName;
  const configPath = core.getInput("config-path") || ".pr-copilot.yml";

  // This Action only makes sense on pull_request events.
  const pr = github.context.payload.pull_request;
  if (!pr) {
    core.warning(
      "PR Review Copilot only runs on `pull_request` events; nothing to do.",
    );
    return;
  }

  const ctx: PullRequestContext = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    prNumber: pr.number,
    headSha: (pr.head as { sha: string }).sha,
  };

  const config = loadConfig(configPath);
  core.info(`Loaded config (model=${config.model}, threshold=${config.severity_threshold}).`);

  const provider = createProvider(providerName, {
    apiKey: geminiApiKey,
    model: config.model,
  });

  const octokit = github.getOctokit(githubToken);

  const files = await getChangedFiles(octokit, ctx, config);
  core.info(`Reviewing ${files.length} in-scope file(s).`);

  const result = await runReview({
    provider,
    config,
    files,
    meta: { title: pr.title as string, body: (pr.body as string) ?? "" },
  });

  await upsertSummaryComment(octokit, ctx, result.summaryMarkdown);

  core.setOutput("risk-score", String(result.risk.score));
  core.setOutput("recommendation", result.risk.recommendation);

  core.info(
    `Review complete: risk ${result.risk.score}/10, ${result.findings.length} finding(s), recommendation=${result.risk.recommendation}.`,
  );
}

main().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
