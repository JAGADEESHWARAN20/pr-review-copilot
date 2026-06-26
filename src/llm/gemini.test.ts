import { describe, expect, it } from "vitest";
import { parseReviewResponse } from "./gemini.js";

describe("parseReviewResponse", () => {
  it("parses a clean JSON object", () => {
    const out = parseReviewResponse(
      JSON.stringify({ summary: "ok", findings: [] }),
    );
    expect(out.summary).toBe("ok");
    expect(out.findings).toEqual([]);
  });

  it("tolerates a ```json code fence", () => {
    const text = "```json\n{\"summary\":\"hi\",\"findings\":[]}\n```";
    expect(parseReviewResponse(text).summary).toBe("hi");
  });

  it("validates findings and keeps valid ones", () => {
    const text = JSON.stringify({
      summary: "s",
      findings: [
        {
          category: "security",
          severity: "critical",
          file: "a.ts",
          line: 3,
          title: "Hardcoded secret",
          description: "Secret in source.",
          suggestion: null,
        },
      ],
    });
    const out = parseReviewResponse(text);
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]!.severity).toBe("critical");
  });

  it("throws on non-JSON output", () => {
    expect(() => parseReviewResponse("I think the code looks fine!")).toThrow(
      /did not return valid JSON/,
    );
  });

  it("drops a malformed finding but keeps the valid ones", () => {
    const text = JSON.stringify({
      summary: "s",
      findings: [
        { category: "security", severity: "boom", file: "a.ts", title: "t", description: "d" }, // bad severity
        { category: "security", severity: "high", file: "a.ts", line: 2, title: "ok", description: "d" },
      ],
    });
    const out = parseReviewResponse(text);
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]!.title).toBe("ok");
  });

  it("normalizes a non-enum category instead of rejecting the finding", () => {
    const text = JSON.stringify({
      summary: "s",
      findings: [
        { category: "Hardcoded Secret", severity: "critical", file: "a.ts", line: 1, title: "secret", description: "d" },
      ],
    });
    const out = parseReviewResponse(text);
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]!.category).toBe("security");
  });
});
