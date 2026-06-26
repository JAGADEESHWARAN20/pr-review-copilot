/** A single changed file in a pull request, narrowed to what the reviewer needs. */
export interface ChangedFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  /** Unified diff hunk for this file. Absent for binary files or very large diffs. */
  patch?: string;
}

/** Minimal PR context the pipeline operates on. */
export interface PullRequestContext {
  owner: string;
  repo: string;
  prNumber: number;
  /** Head SHA — used when posting line-level review comments later. */
  headSha: string;
}
