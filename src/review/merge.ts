import { SEVERITY_ORDER, type Finding } from "../schemas/index.js";

/**
 * Merges findings from multiple agents (+ the secret scanner), removing
 * duplicates. Two findings collide when they target the same file+line and have
 * a near-identical title; on collision we keep the higher-severity one.
 *
 * This is the deterministic alternative to a synthesis LLM call: cheaper, faster,
 * and good enough to keep the PR free of repeated comments.
 */
export function mergeFindings(groups: Finding[][]): Finding[] {
  const byKey = new Map<string, Finding>();

  for (const finding of groups.flat()) {
    const key = dedupeKey(finding);
    const existing = byKey.get(key);
    if (!existing || isMoreSevere(finding, existing)) {
      byKey.set(key, finding);
    }
  }

  return [...byKey.values()].sort(bySeverityThenLocation);
}

function dedupeKey(f: Finding): string {
  const line = f.line ?? "?";
  return `${f.file}:${line}:${normalizeTitle(f.title)}`;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isMoreSevere(a: Finding, b: Finding): boolean {
  return SEVERITY_ORDER.indexOf(a.severity) > SEVERITY_ORDER.indexOf(b.severity);
}

function bySeverityThenLocation(a: Finding, b: Finding): number {
  const sev = SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity);
  if (sev !== 0) return sev;
  if (a.file !== b.file) return a.file.localeCompare(b.file);
  return (a.line ?? 0) - (b.line ?? 0);
}
