import type { ChangedFile } from "./types.js";

/**
 * GitHub's review API only accepts an inline comment on a line that is part of
 * the diff on the RIGHT (new) side — i.e. an added or context line inside a
 * hunk. Posting on any other line returns 422. This computes, per file, the set
 * of new-file line numbers that are safe to comment on.
 */
export function commentableLinesByFile(files: ChangedFile[]): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const file of files) {
    if (file.patch) {
      map.set(file.filename, commentableLines(file.patch));
    }
  }
  return map;
}

/** New-file line numbers that can take a RIGHT-side review comment. */
export function commentableLines(patch: string): Set<number> {
  const lines = new Set<number>();
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      lines.add(newLine); // added line — commentable
      newLine++;
    } else if (raw.startsWith("-") && !raw.startsWith("---")) {
      // deleted line — only on LEFT side, not commentable here
    } else if (!raw.startsWith("\\")) {
      // context line — commentable, advances new-file counter
      // ("\ No newline at end of file" markers are skipped)
      lines.add(newLine);
      newLine++;
    }
  }

  return lines;
}
