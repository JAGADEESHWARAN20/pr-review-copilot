import { describe, expect, it } from "vitest";
import { commentableLines } from "./diff-position.js";

describe("commentableLines", () => {
  it("includes added and context lines, excludes deleted", () => {
    const patch = [
      "@@ -1,3 +1,4 @@",
      " const a = 1;", // line 1 context -> commentable
      "-const b = 2;", // deleted -> not commentable
      "+const b = 20;", // line 2 added -> commentable
      "+const c = 3;", // line 3 added -> commentable
      " const d = 4;", // line 4 context -> commentable
    ].join("\n");
    expect([...commentableLines(patch)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it("handles multiple hunks", () => {
    const patch = [
      "@@ -1,1 +1,1 @@",
      "+a", // line 1
      "@@ -10,1 +10,2 @@",
      "+b", // line 10
      "+c", // line 11
    ].join("\n");
    expect([...commentableLines(patch)].sort((a, b) => a - b)).toEqual([1, 10, 11]);
  });

  it("ignores 'no newline' markers", () => {
    const patch = ["@@ -0,0 +1,1 @@", "+x", "\\ No newline at end of file"].join("\n");
    expect([...commentableLines(patch)]).toEqual([1]);
  });
});
