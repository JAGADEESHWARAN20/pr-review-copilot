/**
 * Local dry-run: exercises the full review pipeline WITHOUT GitHub.
 *
 * Usage:
 *   GEMINI_API_KEY=... npm run dry-run
 *   GEMINI_API_KEY=... npx tsx src/dry-run.ts path/to/file.diff
 *
 * With no argument it reviews a built-in sample diff (a hardcoded secret + an
 * untested async function) so you can verify the model + prompt end-to-end.
 * The rendered summary comment is printed to stdout — nothing is posted.
 */
import { readFileSync, existsSync } from "node:fs";
import { DEFAULT_CONFIG } from "./config/schema.js";

// Load local secrets from a .env file (gitignored) if present, so you can keep
// your key in a file instead of exporting it every shell session.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
import { loadConfig } from "./config/load-config.js";
import { createProvider } from "./llm/factory.js";
import { runReview } from "./review/run-review.js";
import type { ChangedFile } from "./github/types.js";

const SAMPLE_FILES: ChangedFile[] = [
  {
    filename: "src/api/users.ts",
    status: "modified",
    additions: 12,
    deletions: 0,
    patch: [
      "@@ -1,0 +1,12 @@",
      '+const JWT_SECRET = "sk_live_91h2g3f4k5l6m7n8";',
      "+",
      "+export async function getUser(db, userId) {",
      "+  const sql = `SELECT * FROM users WHERE id = '${userId}'`;",
      "+  const rows = await db.query(sql);",
      "+  return rows[0];",
      "+}",
      "+",
      "+export function signToken(payload) {",
      "+  return jwt.sign(payload, JWT_SECRET);",
      "+}",
    ].join("\n"),
  },
];

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Set GEMINI_API_KEY in your environment to run the dry-run.");
    process.exit(1);
  }

  // Use repo config if present, else defaults.
  const config = (() => {
    try {
      return loadConfig(".pr-copilot.yml");
    } catch {
      return DEFAULT_CONFIG;
    }
  })();

  const files = parseFilesArg() ?? SAMPLE_FILES;

  const provider = createProvider("gemini", { apiKey, model: config.model });

  console.error(`Running review with ${provider.name} (${config.model})…\n`);
  const result = await runReview({
    provider,
    config,
    files,
    meta: { title: "Dry-run sample PR", body: "Local pipeline test." },
    log: (msg) => console.error(`[pipeline] ${msg}`),
  });

  console.log(result.summaryMarkdown);
  console.error(
    `\n[dry-run] ${result.findings.length} finding(s), risk ${result.risk.score}/10, ${result.risk.recommendation}.`,
  );
}

/** If a .diff/.patch file path is given, treat its contents as one file's patch. */
function parseFilesArg(): ChangedFile[] | null {
  const path = process.argv[2];
  if (!path) return null;
  const patch = readFileSync(path, "utf8");
  return [
    {
      filename: path,
      status: "modified",
      additions: 0,
      deletions: 0,
      patch,
    },
  ];
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
