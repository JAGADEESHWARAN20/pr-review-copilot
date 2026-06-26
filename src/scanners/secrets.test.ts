import { describe, expect, it } from "vitest";
import { scanForSecrets, addedLines } from "./secrets.js";
import type { ChangedFile } from "../github/types.js";

function file(patch: string): ChangedFile {
  return { filename: "src/api/users.ts", status: "modified", additions: 0, deletions: 0, patch };
}

describe("addedLines", () => {
  it("computes new-file line numbers across context and deletions", () => {
    const patch = [
      "@@ -1,3 +1,4 @@",
      " const a = 1;", // line 1 (context)
      "-const b = 2;", // deleted — no new line
      "+const b = 20;", // line 2 (added)
      "+const c = 3;", // line 3 (added)
      " const d = 4;", // line 4 (context)
    ].join("\n");
    const added = addedLines(patch);
    expect(added).toEqual([
      { lineNumber: 2, content: "const b = 20;" },
      { lineNumber: 3, content: "const c = 3;" },
    ]);
  });
});

describe("scanForSecrets", () => {
  it("flags a hardcoded JWT", () => {
    const patch =
      "@@ -0,0 +1,1 @@\n+const t = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcDEFghiJKLmnoPQRstuv';";
    const f = scanForSecrets([file(patch)]);
    expect(f).toHaveLength(1);
    expect(f[0]!.severity).toBe("critical");
    expect(f[0]!.line).toBe(1);
  });

  it("flags an AWS access key id", () => {
    const patch = "@@ -0,0 +1,1 @@\n+const k = 'AKIAIOSFODNN7EXAMPLE';";
    // 'EXAMPLE' substring triggers placeholder guard — use a non-placeholder key:
    const patch2 = "@@ -0,0 +1,1 @@\n+const k = 'AKIA1234567890ABCDEF';";
    expect(scanForSecrets([file(patch)])).toHaveLength(0); // placeholder skipped
    expect(scanForSecrets([file(patch2)])).toHaveLength(1);
  });

  it("flags a generic secret assignment", () => {
    const patch = '@@ -0,0 +1,1 @@\n+const password = "S3cretP@ssw0rd123";';
    expect(scanForSecrets([file(patch)])).toHaveLength(1);
  });

  it("ignores placeholders and env lookups", () => {
    const patch = [
      "@@ -0,0 +1,2 @@",
      '+const apiKey = "your_api_key_here";',
      "+const secret = process.env.SECRET;",
    ].join("\n");
    expect(scanForSecrets([file(patch)])).toHaveLength(0);
  });

  it("does not flag removed or context lines", () => {
    const patch = [
      "@@ -1,2 +1,1 @@",
      "-const password = \"realSecretValue123\";", // removed — ignore
      " const ok = true;",
    ].join("\n");
    expect(scanForSecrets([file(patch)])).toHaveLength(0);
  });
});
