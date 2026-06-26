import type { ChangedFile } from "../github/types.js";

/**
 * Rough character budget for the diff we send to the model. We target ~8k tokens
 * of diff per the PRD; ~4 chars/token => ~32k chars. Kept conservative to leave
 * headroom for the system prompt and the model's JSON response.
 *
 * The per-agent system prompts live in `src/agents/agents.ts`; this module only
 * builds the shared user prompt (the diff) that every agent receives.
 */
const MAX_DIFF_CHARS = 28_000;

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
