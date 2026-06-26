import type { getOctokit } from "@actions/github";
import type { ChangedFile, PullRequestContext } from "./types.js";
import { commentableLinesByFile } from "./diff-position.js";
import type { Finding, Severity } from "../schemas/index.js";

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

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  info: "🔵",
};

export interface InlineReviewResult {
  /** How many findings were posted as inline comments. */
  posted: number;
  /** Findings that couldn't be placed inline (no line / not in the diff). */
  unplaced: Finding[];
}

/**
 * Posts findings as inline review comments via the Review API.
 *
 * Only findings whose line is part of the diff (commentable on the RIGHT side)
 * are posted inline; the rest are returned as `unplaced` so the caller can list
 * them in the summary comment. Critical/High findings with a `suggestion` render
 * a one-click GitHub ```suggestion block.
 */
export async function postInlineReview(
  octokit: Octokit,
  ctx: PullRequestContext,
  files: ChangedFile[],
  findings: Finding[],
): Promise<InlineReviewResult> {
  const commentable = commentableLinesByFile(files);

  const inline: { path: string; line: number; side: "RIGHT"; body: string }[] = [];
  const unplaced: Finding[] = [];

  for (const f of findings) {
    const lines = commentable.get(f.file);
    if (f.line != null && lines?.has(f.line)) {
      inline.push({ path: f.file, line: f.line, side: "RIGHT", body: renderFindingBody(f) });
    } else {
      unplaced.push(f);
    }
  }

  if (inline.length === 0) {
    return { posted: 0, unplaced };
  }

  await octokit.rest.pulls.createReview({
    owner: ctx.owner,
    repo: ctx.repo,
    pull_number: ctx.prNumber,
    commit_id: ctx.headSha,
    event: "COMMENT",
    comments: inline,
  });

  return { posted: inline.length, unplaced };
}

/** Markdown body for a single inline comment, with an optional suggestion block. */
export function renderFindingBody(f: Finding): string {
  const lines = [
    `${SEVERITY_EMOJI[f.severity]} **${capitalize(f.severity)} · ${f.category}** — ${f.title}`,
    "",
    f.description,
  ];

  // One-click fix for high-impact findings.
  if (f.suggestion && (f.severity === "critical" || f.severity === "high")) {
    lines.push("", "```suggestion", f.suggestion.replace(/\n+$/, ""), "```");
  }

  lines.push("", "_— PR Review Copilot_");
  return lines.join("\n");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
