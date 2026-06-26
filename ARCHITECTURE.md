# Architecture & Context

Living design doc for PR Review Copilot. Updated at the start/end of each phase so
anyone (human or AI) can rebuild the mental model of the codebase quickly.

## Module map

| Module | Responsibility | Key exports |
|--------|----------------|-------------|
| `src/index.ts` | Action entry. Reads inputs, builds PR context, runs the pipeline, posts the comment, sets outputs. | `main()` |
| `src/config/schema.ts` | Zod schema + defaults for `.pr-copilot.yml`. | `configSchema`, `Config`, `DEFAULT_CONFIG` |
| `src/config/load-config.ts` | Reads + validates the config file (missing = defaults, invalid = throw). | `loadConfig()` |
| `src/github/types.ts` | Narrow domain types. | `ChangedFile`, `PullRequestContext` |
| `src/github/get-pr-diff.ts` | Fetch changed files via Octokit; filter by language + ignore_paths. | `getChangedFiles()`, `isFileInScope()` |
| `src/github/post-review.ts` | Upsert the single summary comment (find-by-marker, else create). | `upsertSummaryComment()` |
| `src/github/minimatch.ts` | Tiny glob matcher for ignore_paths (`**`, `*`, `?`). | `minimatch()` |
| `src/llm/provider.ts` | Provider-agnostic `ReviewProvider` interface. | `ReviewProvider`, `ReviewRequest`, `ProviderOptions` |
| `src/llm/factory.ts` | Name → concrete provider. The single LLM swap point. | `createProvider()`, `ProviderName` |
| `src/llm/gemini.ts` | Gemini impl: JSON output, retry, parse + Zod validate. | `GeminiProvider`, `parseReviewResponse()` |
| `src/llm/retry.ts` | Exponential backoff + full jitter. | `withRetry()` |
| `src/prompts/review-prompt.ts` | Reviewer system prompt + diff→user prompt (token-budgeted). | `buildSystemPrompt()`, `buildUserPrompt()` |
| `src/review/run-review.ts` | Orchestration: prompts → LLM → filter → score → render. GitHub-free, unit-testable. | `runReview()`, `ReviewResult` |
| `src/review/risk.ts` | Risk score (0–10), recommendation, summary markdown. | `assessRisk()`, `renderSummaryComment()` |
| `src/schemas/index.ts` | Shared finding/severity schemas + threshold helper. | `findingSchema`, `reviewResponseSchema`, `meetsThreshold()` |
| `src/dry-run.ts` | Local end-to-end harness (no GitHub). | — |

## Data flow (V1)

`pull_request` event → `index.main()` → `loadConfig()` → `getChangedFiles()` (filtered)
→ `runReview()` → `provider.review()` (Gemini, JSON, Zod-validated)
→ filter by `severity_threshold` + disabled checks → `assessRisk()` → `renderSummaryComment()`
→ `upsertSummaryComment()` → outputs `risk-score`, `recommendation`.

## Key design decisions

- **Provider abstraction first.** PRD wants primary + fallback LLMs; `ReviewProvider` +
  `factory.ts` means adding Claude/OpenAI is one new class + one `case`.
- **Validate everything from the model.** LLM output is untrusted: parsed, fence-stripped,
  and Zod-validated before anything is posted. Bad output fails loudly, never posts garbage.
- **Idempotent comment.** One marker-tagged summary comment, updated in place on each push —
  no comment spam across the PR lifecycle.
- **Pipeline is GitHub-free.** `runReview()` takes plain data and returns plain data, so it's
  testable and dry-runnable without the GitHub API.
- **Bundled `dist/`.** JS Actions execute `dist/index.js`; it's built with ncc and committed.

## Invariants / gotchas

- `SEVERITY_ORDER` is ordered low→high; thresholding and scoring depend on that order.
- Removed files are never reviewed (nothing to review in deleted code).
- Diff sent to the model is capped (~28k chars ≈ 8k tokens) and truncated with a marker.
- `dist/` must be rebuilt (`npm run build`) and committed whenever `src/` changes.

## Roadmap context

- **V2 (multi-agent):** split `runReview` into parallel Security/Quality/Coverage providers
  + a synthesis pass; add inline review comments (needs diff line → position mapping) and a
  gitleaks regex pre-scan before the LLM call.
- **V3 (coverage/polish):** parse `coverage.json` for delta; Python + Go extensions in
  `LANGUAGE_EXTENSIONS`; Marketplace listing.
