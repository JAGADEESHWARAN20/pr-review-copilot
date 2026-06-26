import type { getOctokit } from "@actions/github";
import { minimatch } from "./minimatch.js";
import type { Config } from "../config/schema.js";
import type { ChangedFile, PullRequestContext } from "./types.js";

type Octokit = ReturnType<typeof getOctokit>;

/** Map config language names -> file extensions we consider in scope. */
const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  typescript: [".ts", ".tsx", ".mts", ".cts"],
  javascript: [".js", ".jsx", ".mjs", ".cjs"],
  python: [".py"],
  go: [".go"],
};

function extensionsFor(languages: string[]): string[] {
  const exts = new Set<string>();
  for (const lang of languages) {
    for (const ext of LANGUAGE_EXTENSIONS[lang.toLowerCase()] ?? []) {
      exts.add(ext);
    }
  }
  return [...exts];
}

/** True if `filename` should be reviewed given the config's languages + ignore_paths. */
export function isFileInScope(filename: string, config: Config): boolean {
  const ignored = config.ignore_paths.some((pattern) =>
    minimatch(filename, pattern),
  );
  if (ignored) return false;

  const exts = extensionsFor(config.languages);
  // If no known extensions resolved, fall back to reviewing everything not ignored.
  if (exts.length === 0) return true;

  return exts.some((ext) => filename.endsWith(ext));
}

/**
 * Fetches the list of changed files (with patches) for a PR, paginating through
 * all pages, then filters to in-scope files. Removed files are dropped — there's
 * nothing to review in deleted code.
 */
export async function getChangedFiles(
  octokit: Octokit,
  ctx: PullRequestContext,
  config: Config,
): Promise<ChangedFile[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner: ctx.owner,
    repo: ctx.repo,
    pull_number: ctx.prNumber,
    per_page: 100,
  });

  return files
    .filter((f) => f.status !== "removed")
    .filter((f) => isFileInScope(f.filename, config))
    .map((f) => ({
      filename: f.filename,
      status: f.status as ChangedFile["status"],
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    }));
}
