import * as core from "@actions/core";
import * as github from "@actions/github";
import { loadConfig } from "./config/load-config.js";
import { getChangedFiles } from "./github/get-pr-diff.js";
import { upsertSummaryComment, postInlineReview } from "./github/post-review.js";
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
    log: (msg) => core.info(msg),
  });

  // Inline comments first (one-click suggestions on the exact lines), then the
  // summary comment. Inline posting must never block the summary, so guard it.
  if (result.findings.length > 0) {
    try {
      const inline = await postInlineReview(octokit, ctx, files, result.findings);
      core.info(`Posted ${inline.posted} inline comment(s); ${inline.unplaced.length} in summary only.`);
    } catch (err) {
      core.warning(
        `Could not post inline review comments (${err instanceof Error ? err.message : String(err)}). Summary will still be posted.`,
      );
    }
  }

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
