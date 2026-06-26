# 🤖 PR Review Copilot

An AI-native **GitHub Action** that reviews pull requests the moment they're opened or updated. It analyzes the diff for **security**, **code quality**, and **test-coverage** issues, then posts a summary comment with a risk score and recommended action — right inside the PR.

> A developer, for developers — save 30–90 minutes of manual review time on every PR.

**Status:** V2 — **multi-agent** review (parallel Security / Quality / Coverage agents) + a deterministic secret pre-scan, **inline review comments** with one-click `suggestion` blocks, plus the summary comment. Configurable via `.pr-copilot.yml`. Powered by **Google Gemini** (Claude / OpenAI providers land in a later version).

---

## How it works

```
PR opened / updated
   └─► GitHub Action runs
         ├─ fetch changed files + diff (Octokit)
         ├─ filter to in-scope files (languages + ignore_paths)
         ├─ send diff to the LLM with a precise reviewer prompt
         ├─ validate the JSON findings (Zod)
         ├─ score risk (0–10) + recommendation
         └─ post / update one summary comment on the PR
```

The pipeline is **provider-agnostic**: swapping the LLM is a one-line change in `src/llm/factory.ts`.

---

## Quick start (use it on your repo)

1. Add your Gemini API key as a repository secret named `GEMINI_API_KEY`
   (**Settings → Secrets and variables → Actions → New repository secret**).

2. Add a workflow at `.github/workflows/pr-review.yml`:

   ```yaml
   name: PR Review Copilot
   on:
     pull_request:
       types: [opened, synchronize, reopened]
   permissions:
     contents: read
     pull-requests: write
   jobs:
     review:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
           with: { fetch-depth: 0 }
         - uses: JAGADEESHWARAN20/pr-review-copilot@main
           with:
             github-token: ${{ secrets.GITHUB_TOKEN }}
             gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
   ```

3. Open a PR. Within ~a minute, the Copilot posts its review. 🎉

---

## Configuration — `.pr-copilot.yml`

Drop this at your repo root (all fields optional; defaults shown):

```yaml
model: gemini-2.5-flash
checks:
  security: true
  test_coverage: true
  code_quality: true
severity_threshold: medium      # info | medium | high | critical
min_coverage_delta: -5
languages: [typescript, javascript]
ignore_paths:
  - "**/*.test.ts"
  - "**/dist/**"
  - "**/node_modules/**"
max_comments: 20
```

| Action input    | Required | Description |
|-----------------|----------|-------------|
| `github-token`  | yes      | Usually `${{ secrets.GITHUB_TOKEN }}`. Needs `pull-requests: write`. |
| `gemini-api-key`| yes\*    | Your Google Gemini API key. \*Required for the default `gemini` provider. |
| `llm-provider`  | no       | `gemini` (default). |
| `config-path`   | no       | Path to config file. Default `.pr-copilot.yml`. |

**Outputs:** `risk-score` (0–10), `recommendation` (`approve` \| `review_required` \| `request_changes`).

---

## Local development

```bash
npm install
npm run typecheck     # tsc --noEmit
npm test              # vitest (unit tests)
npm run build         # bundle to dist/ with ncc (commit dist/ — the Action runs it)

# Try a real review without GitHub (prints the summary, posts nothing):
GEMINI_API_KEY=your_key npm run dry-run
# or against your own diff file:
GEMINI_API_KEY=your_key npx tsx src/dry-run.ts path/to/change.diff
```

### Project layout

```
src/
  index.ts            # Action entry — wires GitHub runtime to the pipeline
  config/             # .pr-copilot.yml schema + loader (Zod)
  github/             # Octokit diff fetch, comment upsert, glob matcher
  llm/                # provider interface, factory, Gemini impl, retry
  prompts/            # reviewer system + user prompt builders
  review/             # pipeline orchestration + risk scoring / summary render
  schemas/            # shared Zod schemas (findings, severities)
  dry-run.ts          # local end-to-end harness
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the design and the roadmap to multi-agent (Phase 2) and coverage analysis (Phase 3).

---

## Roadmap

- **V1:** Combined review + summary comment. Gemini. ✅
- **V2 (now):** Parallel Security / Quality / Coverage agents, deterministic secret pre-scan, inline one-click suggestion comments. ✅
- **V3:** Coverage delta from `coverage.json`, Python + Go support, Claude/OpenAI providers, GitHub Marketplace listing.

---

## License

MIT
