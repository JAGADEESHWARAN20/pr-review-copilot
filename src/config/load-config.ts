import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { configSchema, DEFAULT_CONFIG, type Config } from "./schema.js";

export type { Config };

/**
 * Loads and validates `.pr-copilot.yml`.
 *
 * - Missing file  -> returns DEFAULT_CONFIG (a missing config is not an error;
 *   the Action should work out-of-the-box).
 * - Present file  -> parsed as YAML and validated against `configSchema`.
 *   Invalid config IS an error: we throw so the user gets a clear failure
 *   instead of silently running with surprising settings.
 */
export function loadConfig(configPath: string): Config {
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(
      `Failed to parse config file "${configPath}" as YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // An empty file parses to `null`/`undefined`; treat that as "use defaults".
  if (raw == null) {
    return DEFAULT_CONFIG;
  }

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid configuration in "${configPath}":\n${issues}`,
    );
  }

  return result.data;
}
