import { describe, expect, it } from "vitest";
import { minimatch } from "./minimatch.js";

describe("minimatch", () => {
  it("matches **/*.test.ts at any depth and at root", () => {
    expect(minimatch("a/b/c.test.ts", "**/*.test.ts")).toBe(true);
    expect(minimatch("c.test.ts", "**/*.test.ts")).toBe(true);
    expect(minimatch("a/b/c.ts", "**/*.test.ts")).toBe(false);
  });

  it("matches trailing ** including files", () => {
    expect(minimatch("migrations/001_init.sql", "migrations/**")).toBe(true);
    expect(minimatch("migrations/sub/x.sql", "migrations/**")).toBe(true);
    expect(minimatch("src/migrations/x.sql", "migrations/**")).toBe(false);
  });

  it("matches **/node_modules/** anywhere", () => {
    expect(minimatch("node_modules/x.js", "**/node_modules/**")).toBe(true);
    expect(minimatch("a/b/node_modules/c/d.js", "**/node_modules/**")).toBe(true);
    expect(minimatch("a/b/c.js", "**/node_modules/**")).toBe(false);
  });

  it("single * does not cross slashes", () => {
    expect(minimatch("dist/a.js", "dist/*.js")).toBe(true);
    expect(minimatch("dist/sub/a.js", "dist/*.js")).toBe(false);
  });

  it("normalises windows separators", () => {
    expect(minimatch("a\\b\\c.test.ts", "**/*.test.ts")).toBe(true);
  });
});
