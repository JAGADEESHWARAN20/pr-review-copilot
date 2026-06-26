import { z } from "zod";
import { severitySchema } from "../schemas/index.js";

/**
 * Schema + defaults for `.pr-copilot.yml`. Every field is optional in the file;
 * `.parse()` fills in the defaults below so the rest of the app always sees a
 * fully-populated, validated Config object.
 */
export const configSchema = z.object({
  model: z.string().min(1).default("gemini-2.0-flash"),
  checks: z
    .object({
      security: z.boolean().default(true),
      test_coverage: z.boolean().default(true),
      code_quality: z.boolean().default(true),
    })
    .default({}),
  severity_threshold: severitySchema.default("medium"),
  min_coverage_delta: z.number().default(-5),
  languages: z
    .array(z.string())
    .default(["typescript", "javascript"]),
  ignore_paths: z
    .array(z.string())
    .default([
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/dist/**",
      "**/node_modules/**",
    ]),
  max_comments: z.number().int().positive().default(20),
});

export type Config = z.infer<typeof configSchema>;

/** A Config with all defaults applied — used when no config file is present. */
export const DEFAULT_CONFIG: Config = configSchema.parse({});
