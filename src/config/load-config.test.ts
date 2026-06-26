import { describe, expect, it, afterEach } from "vitest";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "./load-config.js";
import { DEFAULT_CONFIG } from "./schema.js";

const tmpFiles: string[] = [];

function writeTmpConfig(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "prc-"));
  const path = join(dir, ".pr-copilot.yml");
  writeFileSync(path, contents, "utf8");
  tmpFiles.push(dir);
  return path;
}

afterEach(() => {
  while (tmpFiles.length) {
    rmSync(tmpFiles.pop()!, { recursive: true, force: true });
  }
});

describe("loadConfig", () => {
  it("returns defaults when the file is missing", () => {
    expect(loadConfig("does/not/exist.yml")).toEqual(DEFAULT_CONFIG);
  });

  it("applies defaults for omitted fields", () => {
    const path = writeTmpConfig("model: gemini-2.5-pro\n");
    const cfg = loadConfig(path);
    expect(cfg.model).toBe("gemini-2.5-pro");
    expect(cfg.severity_threshold).toBe("medium"); // default
    expect(cfg.max_comments).toBe(20); // default
  });

  it("parses checks and arrays", () => {
    const path = writeTmpConfig(
      ["checks:", "  security: false", "languages:", "  - go", ""].join("\n"),
    );
    const cfg = loadConfig(path);
    expect(cfg.checks.security).toBe(false);
    expect(cfg.checks.code_quality).toBe(true); // default
    expect(cfg.languages).toEqual(["go"]);
  });

  it("throws on an invalid severity_threshold", () => {
    const path = writeTmpConfig("severity_threshold: nonsense\n");
    expect(() => loadConfig(path)).toThrow(/Invalid configuration/);
  });

  it("returns defaults for an empty file", () => {
    const path = writeTmpConfig("");
    expect(loadConfig(path)).toEqual(DEFAULT_CONFIG);
  });
});
