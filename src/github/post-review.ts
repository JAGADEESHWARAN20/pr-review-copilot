import type { getOctokit } from "@actions/github";
import type { PullRequestContext } from "./types.js";

type Octokit = ReturnType<typeof getOctokit>;

/**
 * Hidden marker embedded in our summary comment. We use it to find and update
 * our previous comment on re-runs instead of posting a new one each push.
 */
const COMMENT_MARKER = "<!-- pr-review-copilot:summary -->";

/**
 * Posts (or updates) the single summary comment on the PR.
 *
 * On the first run we create the comment. On subsequent runs (new pushes to the
 * same PR) we find the existing comment by its hidden marker and edit it, so the
 * PR thread stays clean.
 */
export async function upsertSummaryComment(
  octokit: Octokit,
  ctx: PullRequestContext,
  body: string,
): Promise<void> {
  const markedBody = `${COMMENT_MARKER}\n${body}`;

  const existing = await findExistingComment(octokit, ctx);

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner: ctx.owner,
      repo: ctx.repo,
      comment_id: existing,
      body: markedBody,
    });
    return;
  }

  await octokit.rest.issues.createComment({
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: ctx.prNumber,
    body: markedBody,
  });
}

async function findExistingComment(
  octokit: Octokit,
  ctx: PullRequestContext,
): Promise<number | null> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: ctx.prNumber,
    per_page: 100,
  });

  const mine = comments.find((c) => c.body?.includes(COMMENT_MARKER));
  return mine ? mine.id : null;
}
