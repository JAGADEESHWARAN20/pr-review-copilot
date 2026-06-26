import type { Category } from "../schemas/index.js";

/**
 * A specialized review agent. Each agent is one focused LLM call with a system
 * prompt scoped to a single concern. Running them separately (in parallel) gives
 * sharper, less-diluted findings than one combined prompt — the core of the
 * "multi-agent coordination" pitch.
 */
export interface Agent {
  /** Stable id, also used in logs. */
  name: string;
  /** Category every finding from this agent is tagged with. */
  category: Category;
  /** Whether the agent is enabled given the config's `checks`. */
  enabledKey: "security" | "code_quality" | "test_coverage";
  /** The agent's focused instructions (appended to the shared JSON contract). */
  focus: string;
}

const JSON_CONTRACT = [
  "",
  "Output: respond with a SINGLE JSON object and nothing else:",
  "{",
  '  "summary": string,   // one short sentence on this dimension of the change',
  '  "findings": [',
  "    {",
  '      "category": string,  // will be normalized; set it to your dimension',
  '      "severity": "info" | "medium" | "high" | "critical",',
  '      "file": string,      // exact path from the diff',
  '      "line": number | null,  // 1-based line in the NEW file, else null',
  '      "title": string,',
  '      "description": string,',
  '      "suggestion": string | null  // replacement code for critical/high, no markdown fences',
  "    }",
  "  ]",
  "}",
  "Do not wrap the JSON in markdown. No commentary before or after it.",
  "Only report issues you can see in the diff. Prefer precision over volume.",
].join("\n");

export const AGENTS: Agent[] = [
  {
    name: "security",
    category: "security",
    enabledKey: "security",
    focus: [
      "You are a application security specialist reviewing ONLY the security of this diff.",
      "Look for: hardcoded secrets/keys, SQL/NoSQL/command injection, SSRF and open redirects,",
      "insecure deserialization, missing authentication/authorization on new routes, unsafe use of",
      "eval/exec, path traversal, and insecure direct object references (IDOR).",
      "Severity: 'critical' for exploitable vulnerabilities or exposed secrets; 'high' for likely",
      "security weaknesses; 'medium' for hardening gaps. Ignore pure style.",
    ].join(" "),
  },
  {
    name: "quality",
    category: "quality",
    enabledKey: "code_quality",
    focus: [
      "You are a senior engineer reviewing ONLY code-quality and correctness of this diff.",
      "Look for: logic bugs, null/undefined handling, unhandled promise rejections, missing error",
      "handling, type-safety holes, off-by-one errors, resource leaks, undeclared/unused symbols,",
      "and clear duplication. Do NOT report security issues (another agent covers those).",
      "Severity: 'high' for likely runtime bugs; 'medium' for quality problems; 'info' for optional.",
    ].join(" "),
  },
  {
    name: "coverage",
    category: "coverage",
    enabledKey: "test_coverage",
    focus: [
      "You are a test-engineering specialist reviewing ONLY test coverage of this diff.",
      "Identify new or changed EXPORTED functions/classes/components that lack any corresponding",
      "test assertions. Flag untested branches and error paths in the changed code.",
      "Severity: 'high' for untested critical/exported logic; 'medium' for partial coverage gaps.",
      "Do not invent tests; just identify what is uncovered.",
    ].join(" "),
  },
];

/** Builds the full system prompt for an agent. */
export function buildAgentSystemPrompt(agent: Agent): string {
  return `${agent.focus}\n${JSON_CONTRACT}`;
}
