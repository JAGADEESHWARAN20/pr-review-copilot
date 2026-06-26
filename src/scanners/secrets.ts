import type { ChangedFile } from "../github/types.js";
import type { Finding } from "../schemas/index.js";

/**
 * Deterministic secret pre-scan over ADDED diff lines.
 *
 * This runs before/alongside the LLM agents: it's fast, free, and has zero
 * hallucination risk, so a hit here is a high-confidence critical finding.
 * Patterns are intentionally conservative to keep false positives low.
 */
interface SecretRule {
  id: string;
  title: string;
  regex: RegExp;
}

const RULES: SecretRule[] = [
  {
    id: "aws-access-key-id",
    title: "AWS Access Key ID",
    regex: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[0-9A-Z]{16}\b/,
  },
  {
    id: "private-key-block",
    title: "Private key block",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  },
  {
    id: "google-api-key",
    title: "Google/Gemini API key",
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/,
  },
  {
    id: "github-token",
    title: "GitHub token",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{36}\b/,
  },
  {
    id: "slack-token",
    title: "Slack token",
    regex: /\bxox[abpsr]-[0-9A-Za-z-]{10,}\b/,
  },
  {
    id: "stripe-secret-key",
    title: "Stripe secret key",
    regex: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\b/,
  },
  {
    id: "openai-key",
    title: "OpenAI API key",
    regex: /\bsk-(?:proj-)?[0-9A-Za-z\-_]{20,}\b/,
  },
  {
    id: "jwt",
    title: "JSON Web Token (JWT)",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    id: "generic-secret-assignment",
    title: "Hardcoded secret/credential",
    // key-ish name = quoted value of reasonable length. Skips obvious placeholders.
    regex:
      /(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\s*[:=]\s*["'`][^"'`]{8,}["'`]/i,
  },
];

/** Values we never treat as real secrets (templates / placeholders). */
const PLACEHOLDER = /your_|example|changeme|placeholder|xxxx|<[^>]+>|\$\{|process\.env|\.\.\./i;

/**
 * Scans the added lines of each file's patch and returns critical security
 * findings for any secret pattern hit (deduped per file+line+rule).
 */
export function scanForSecrets(files: ChangedFile[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    if (!file.patch) continue;

    for (const { lineNumber, content } of addedLines(file.patch)) {
      for (const rule of RULES) {
        if (!rule.regex.test(content)) continue;
        if (PLACEHOLDER.test(content)) continue;

        const key = `${file.filename}:${lineNumber}:${rule.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        findings.push({
          category: "security",
          severity: "critical",
          file: file.filename,
          line: lineNumber,
          title: `${rule.title} detected`,
          description:
            `A ${rule.title.toLowerCase()} appears to be hardcoded in the diff. ` +
            `Remove it from source, rotate the credential, and load it from a secret manager or environment variable instead.`,
          suggestion: null,
        });
      }
    }
  }

  return findings;
}

interface AddedLine {
  lineNumber: number; // 1-based line in the NEW file
  content: string;
}

/**
 * Walks a unified-diff patch and yields each added (`+`) line with its line
 * number in the new file, derived from the `@@ -a,b +c,d @@` hunk headers.
 */
export function addedLines(patch: string): AddedLine[] {
  const out: AddedLine[] = [];
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      out.push({ lineNumber: newLine, content: raw.slice(1) });
      newLine++;
    } else if (raw.startsWith("-") && !raw.startsWith("---")) {
      // deleted line — does not advance the new-file counter
    } else {
      // context line (or metadata) — advances the new-file counter
      newLine++;
    }
  }

  return out;
}
