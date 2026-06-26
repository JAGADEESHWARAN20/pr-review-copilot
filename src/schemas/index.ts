import { z } from "zod";

/**
 * Severity ordering is meaningful: it drives filtering by `severity_threshold`
 * and risk-score weighting. Keep this array ordered low -> high.
 */
export const SEVERITY_ORDER = ["info", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

export const severitySchema = z.enum(SEVERITY_ORDER);

export const categorySchema = z.enum(["security", "quality", "coverage"]);
export type Category = z.infer<typeof categorySchema>;

/**
 * A single issue found by an LLM agent. The LLM is asked to return objects
 * matching this shape; anything that fails validation is dropped (never posted).
 */
export const findingSchema = z.object({
  category: categorySchema,
  severity: severitySchema,
  file: z.string().min(1),
  /** 1-based line in the new version of the file, when known. */
  line: z.number().int().positive().nullable().optional(),
  title: z.string().min(1).max(200),
  /** Human-readable explanation of the problem and why it matters. */
  description: z.string().min(1),
  /** Optional GitHub-suggestion replacement code (without the ```suggestion fence). */
  suggestion: z.string().nullable().optional(),
});
export type Finding = z.infer<typeof findingSchema>;

/** The full structured response we expect back from a review LLM call. */
export const reviewResponseSchema = z.object({
  findings: z.array(findingSchema).default([]),
  /** One-paragraph natural-language summary of the diff's overall health. */
  summary: z.string().default(""),
});
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

export const recommendationSchema = z.enum([
  "approve",
  "review_required",
  "request_changes",
]);
export type Recommendation = z.infer<typeof recommendationSchema>;

/** Returns true if `severity` is at or above `threshold` in SEVERITY_ORDER. */
export function meetsThreshold(severity: Severity, threshold: Severity): boolean {
  return SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(threshold);
}
