import type {
  Category,
  Finding,
  Recommendation,
  Severity,
} from "../schemas/index.js";

/** Severity weights used to compute the 0–10 risk score. */
const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: 0,
  medium: 1,
  high: 3,
  critical: 6,
};

export interface RiskAssessment {
  score: number; // 0–10
  recommendation: Recommendation;
}

/**
 * Computes a 0–10 risk score from findings and maps it to a recommendation.
 *
 * Any critical finding forces at least "request_changes". The score is a capped,
 * weighted sum so a couple of mediums don't outweigh a single critical.
 */
export function assessRisk(findings: Finding[]): RiskAssessment {
  const weighted = findings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHT[f.severity],
    0,
  );
  const score = Math.min(10, weighted);

  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasHigh = findings.some((f) => f.severity === "high");

  let recommendation: Recommendation;
  if (hasCritical) {
    recommendation = "request_changes";
  } else if (hasHigh || score >= 4) {
    recommendation = "review_required";
  } else {
    recommendation = "approve";
  }

  return { score, recommendation };
}

const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  approve: "✅ Looks good",
  review_required: "⚠️ Review Required",
  request_changes: "❌ Request Changes",
};

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  info: "🔵",
};

/**
 * Renders the summary comment markdown:
 *   - header with risk score + recommendation
 *   - per-category status table
 *   - the model's natural-language summary
 *   - a list of the highest-severity findings
 */
export function renderSummaryComment(args: {
  findings: Finding[];
  summary: string;
  risk: RiskAssessment;
  model: string;
}): string {
  const { findings, summary, risk, model } = args;

  const lines: string[] = [];
  lines.push("## 🤖 PR Review Copilot");
  lines.push("");
  lines.push(
    `**Risk Score:** ${risk.score}/10 — ${RECOMMENDATION_LABEL[risk.recommendation]}`,
  );
  lines.push("");
  lines.push(renderCategoryTable(findings));

  if (summary.trim()) {
    lines.push("");
    lines.push(summary.trim());
  }

  const topFindings = [...findings]
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .sort(bySeverityDesc);

  if (topFindings.length > 0) {
    lines.push("");
    lines.push("### Key Findings");
    for (const f of topFindings) {
      const loc = f.line ? `${f.file}:${f.line}` : f.file;
      lines.push(`- ${SEVERITY_EMOJI[f.severity]} **[${loc}]** ${f.title}`);
    }
  }

  if (findings.length === 0) {
    lines.push("");
    lines.push("No issues found at or above the configured severity threshold. 🎉");
  }

  lines.push("");
  lines.push("---");
  lines.push(`_Reviewed by PR Review Copilot · Powered by ${model}_`);

  return lines.join("\n");
}

function renderCategoryTable(findings: Finding[]): string {
  const categories: { key: Category; label: string }[] = [
    { key: "security", label: "🔐 Security" },
    { key: "coverage", label: "🧪 Test Coverage" },
    { key: "quality", label: "🧹 Code Quality" },
  ];

  const rows = categories.map(({ key, label }) => {
    const inCat = findings.filter((f) => f.category === key);
    const crit = inCat.filter((f) => f.severity === "critical").length;
    const high = inCat.filter((f) => f.severity === "high").length;
    const rest = inCat.length - crit - high;

    let status: string;
    if (crit > 0) status = "❌ Fail";
    else if (high > 0) status = "⚠️ Warn";
    else if (rest > 0) status = "⚠️ Warn";
    else status = "✅ Pass";

    const issues =
      inCat.length === 0
        ? "—"
        : [
            crit ? `${crit} critical` : null,
            high ? `${high} high` : null,
            rest ? `${rest} other` : null,
          ]
            .filter(Boolean)
            .join(", ");

    return `| ${label} | ${status} | ${issues} |`;
  });

  return [
    "| Check | Status | Issues |",
    "|-------|--------|--------|",
    ...rows,
  ].join("\n");
}

function bySeverityDesc(a: Finding, b: Finding): number {
  return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
}
