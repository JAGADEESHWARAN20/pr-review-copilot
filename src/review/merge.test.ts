import { describe, expect, it } from "vitest";
import { mergeFindings } from "./merge.js";
import type { Finding } from "../schemas/index.js";

function f(p: Partial<Finding>): Finding {
  return {
    category: "security",
    severity: "high",
    file: "a.ts",
    line: 10,
    title: "SQL Injection",
    description: "d",
    suggestion: null,
    ...p,
  };
}

describe("mergeFindings", () => {
  it("dedupes same file+line+title, keeping the higher severity", () => {
    const merged = mergeFindings([
      [f({ severity: "high" })],
      [f({ severity: "critical" })],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.severity).toBe("critical");
  });

  it("treats title variants as the same finding", () => {
    const merged = mergeFindings([
      [f({ title: "SQL Injection" })],
      [f({ title: "sql injection!" })],
    ]);
    expect(merged).toHaveLength(1);
  });

  it("keeps distinct findings on different lines", () => {
    const merged = mergeFindings([[f({ line: 10 }), f({ line: 20 })]]);
    expect(merged).toHaveLength(2);
  });

  it("sorts by severity descending", () => {
    const merged = mergeFindings([
      [f({ line: 1, severity: "medium", title: "a" })],
      [f({ line: 2, severity: "critical", title: "b" })],
      [f({ line: 3, severity: "high", title: "c" })],
    ]);
    expect(merged.map((x) => x.severity)).toEqual(["critical", "high", "medium"]);
  });
});
