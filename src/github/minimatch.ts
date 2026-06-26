/**
 * Tiny glob matcher — just enough for `ignore_paths` patterns.
 *
 * Supported:
 *   **  -> matches any number of path segments (including zero) and slashes
 *   *   -> matches anything except a slash
 *   ?   -> matches a single non-slash character
 *
 * We deliberately avoid pulling in the full `minimatch` package: our patterns
 * are simple, and a small, audited matcher keeps the bundled Action lean.
 */
export function minimatch(input: string, pattern: string): boolean {
  // Normalise Windows-style separators so patterns written with "/" still work.
  const path = input.replace(/\\/g, "/");
  return globToRegExp(pattern).test(path);
}

function globToRegExp(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        // "**" — consume the second star.
        i++;
        if (pattern[i + 1] === "/") {
          // "**/" — zero or more leading path segments (so it also matches
          // a file with no directory prefix).
          i++;
          re += "(?:.*/)?";
        } else {
          // trailing/bare "**" — match anything, including across slashes,
          // so e.g. "migrations/**" covers "migrations/001_init.sql".
          re += ".*";
        }
      } else {
        re += "[^/]*"; // single-segment wildcard
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += escapeRegExpChar(c);
    }
  }
  return new RegExp(`^${re}$`);
}

function escapeRegExpChar(c: string): string {
  return /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
}
