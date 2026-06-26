import { describe, expect, it } from "vitest";
import { assessRisk, renderSummaryComment } from "./risk.js";
import type { Finding } from "../schemas/index.js";

function finding(partial: Partial<Finding>): Finding {
  return {
    category: "quality",
    severity: "medium",
    file: "src/x.ts",
    line: 1,
    title: "Example",
    description: "desc",
    suggestion: null,
    ...partial,
  };
}

describe("assessRisk", () => {
  it("returns approve with no findings", () => {
    const r = assessRisk([]);
    expect(r.score).toBe(0);
    expect(r.recommendation).toBe("approve");
  });

  it("forces request_changes on any critical", () => {
    const r = assessRisk([finding({ severity: "critical" })]);
    expect(r.recommendation).toBe("request_changes");
    expect(r.score).toBeGreaterThanOrEqual(6);
  });

  it("review_required when a high is present", () => {
    const r = assessRisk([finding({ severity: "high" })]);
    expect(r.recommendation).toBe("review_required");
  });

  it("caps score at 10", () => {
    const many = Array.from({ length: 5 }, () => finding({ severity: "critical" }));
    expect(assessRisk(many).score).toBe(10);
  });
});

describe("renderSummaryComment", () => {
  it("includes the risk header and powered-by line", () => {
    const findings = [finding({ severity: "critical", category: "security", title: "Hardcoded secret" })];
    const md = renderSummaryComment({
      findings,
      summary: "Risky change.",
      risk: assessRisk(findings),
      model: "gemini-2.5-flash",
    });
    expect(md).toContain("PR Review Copilot");
    expect(md).toContain("Risk Score:");
    expect(md).toContain("Hardcoded secret");
    expect(md).toContain("gemini-2.5-flash");
  });

  it("celebrates a clean diff", () => {
    const md = renderSummaryComment({
      findings: [],
      summary: "",
      risk: assessRisk([]),
      model: "gemini-2.5-flash",
    });
    expect(md).toContain("No issues found");
  });
});
