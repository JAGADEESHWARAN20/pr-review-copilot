# Product Requirements Document
## PR Review Copilot — AI-Native GitHub Pull Request Assistant

**Version:** 1.0  
**Author:** Jagadeeshwaran P  
**Date:** June 26, 2026  
**Status:** Draft  

---

## 1. Executive Summary

PR Review Copilot is an AI-native GitHub Action that automatically reviews pull requests the moment they are opened or updated. It performs multi-dimensional code analysis — security vulnerability detection, test coverage verification, code quality checks, and precise in-line edit suggestions — by coordinating multiple LLM calls via the OpenAI/Anthropic API. It is built by a developer, for developers, and targets saving 30–90 minutes of manual review time per PR.

---

## 2. Problem Statement

Manual code review is the #1 bottleneck in modern development workflows. Developers spend a disproportionate amount of time on repetitive, pattern-detectable issues — exposed secrets, missing null checks, uncovered edge cases, inconsistent naming — before a human reviewer can focus on architecture and logic.

**Core pain points:**
- Reviewers miss security issues (hardcoded secrets, SQL injection surfaces, SSRF vectors) buried in large diffs
- No automated enforcement of test coverage thresholds on a per-PR basis
- Generic linting feedback is noisy and ignores business context
- Async review cycles introduce 4–48 hour delays in small/solo teams
- Solo developers and small agencies have no peer reviewer available

**Target users:** Solo developers, small engineering teams (2–10), open-source maintainers, and freelance developers who merge 1–20 PRs per week.

---

## 3. Goals & Non-Goals

### Goals
- Deliver an AI review comment on every PR within 60 seconds of opening or pushing
- Detect critical security issues (OWASP Top 10 surface patterns) with high recall
- Verify test coverage delta (new code vs. existing tests) and flag uncovered functions
- Post precise, actionable in-line suggestions with code snippets — not generic warnings
- Provide a summary comment with a risk score and recommended action (Approve / Request Changes / Review Required)
- Support TypeScript/JavaScript, Python, and Go codebases at launch

### Non-Goals
- Replacing human reviewers — this is a copilot, not an auto-merger
- Hosting or fine-tuning custom LLM models
- Real-time IDE plugin (CLI/Action first)
- Support for private self-hosted GitHub Enterprise at launch
- Full SAST (static analysis security testing) at the depth of Semgrep/Snyk

---

## 4. User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|----------|
| US-01 | Solo developer | Get an AI review the moment I open a PR | I catch bugs before self-merging |
| US-02 | Team lead | See a risk summary at the top of every PR | I triage which PRs need deep human review |
| US-03 | Open-source maintainer | Automatically check contributor PRs for security issues | I don't merge exposed secrets or vulnerable patterns |
| US-04 | Developer | Receive specific inline code suggestions I can apply with one click | I fix issues without back-and-forth context switching |
| US-05 | Developer | Configure which checks to enable/disable per repo | I suppress rules irrelevant to my stack |
| US-06 | Team | Set a minimum test coverage delta | New features aren't merged without tests |

---

## 5. Feature Specifications

### 5.1 Core Review Engine

**Trigger events:** `pull_request` (opened, synchronize, reopened)

The engine executes a multi-step pipeline:

1. **Diff extraction** — Fetch PR diff via GitHub API; filter to changed files only
2. **Context enrichment** — Retrieve up to 40 lines of context around each changed chunk; load relevant adjacent files (imported modules, test files)
3. **Parallel LLM analysis** — Fire three concurrent API calls:
   - **Security agent** — Analyze for OWASP Top 10 patterns, secret exposure, insecure dependencies
   - **Quality agent** — Check code logic, null handling, type safety, naming, duplication
   - **Test coverage agent** — Map new functions/branches to existing test files; flag untested code paths
4. **Synthesis pass** — A final LLM call aggregates findings, deduplicates, ranks by severity, and generates the summary
5. **Comment posting** — Post inline review comments via GitHub Review API; post summary as a top-level PR comment

**Priority levels:**
- 🔴 **Critical** — Security vulnerabilities, exposed secrets, data loss risk (always blocks)
- 🟠 **High** — Missing error handling, untested critical paths, breaking type errors
- 🟡 **Medium** — Code quality, coverage gaps, naming inconsistency
- 🔵 **Info** — Style suggestions, optional improvements (configurable to suppress)

### 5.2 Security Analysis

Detects pattern-level security issues via LLM prompt engineering + regex pre-filter:

- Hardcoded secrets and API keys (pre-scan with regex before LLM call to save tokens)
- SQL injection surfaces (string interpolation into query builders)
- SSRF/open redirect vectors
- `eval()` and dangerous function usage
- Insecure direct object references in API routes
- Missing authentication middleware on new routes
- Dependency version pinning issues in `package.json` / `requirements.txt`

Integration: Run `secret scanning` check first (fast, deterministic), then pass flagged + surrounding context to the security LLM agent.

### 5.3 Test Coverage Analysis

- Parse test files adjacent to changed source files
- Use LLM to map exported functions/components in the diff to test assertions
- Flag functions with zero test coverage
- If a `coverage.json` artifact exists from CI, parse it and compute delta
- Post coverage delta as a PR comment table: `File | Before | After | Δ`

### 5.4 Inline Code Suggestions

Each finding includes a `suggestion` block using GitHub's suggestion syntax:

```suggestion
const result = await db.query(sql, [userId]);  // parameterized query
```

Users can apply suggestions with a single click from the GitHub UI. Suggestions are only generated for Critical and High findings.

### 5.5 Summary Comment

Posted as the first comment on the PR:

```
## 🤖 PR Review Copilot

**Risk Score:** 7/10 — ⚠️ Review Required

| Check | Status | Issues |
|-------|--------|--------|
| 🔐 Security | ❌ Fail | 2 critical, 1 high |
| 🧪 Test Coverage | ⚠️ Warn | 3 functions uncovered |
| 🧹 Code Quality | ✅ Pass | 2 minor suggestions |

### Critical Findings
- [line 42, api/users.ts] Hardcoded JWT secret detected
- [line 87, api/users.ts] SQL string interpolation — use parameterized queries

_Reviewed by PR Review Copilot v1.0 · Powered by OpenAI GPT-4o_
```

### 5.6 Configuration (`.pr-copilot.yml`)

```yaml
model: gpt-4o          # or claude-3-5-sonnet-20241022
checks:
  security: true
  test_coverage: true
  code_quality: true
min_coverage_delta: -5   # Fail if coverage drops more than 5%
severity_threshold: medium  # Only post medium and above
languages:
  - typescript
  - javascript
ignore_paths:
  - "**/*.test.ts"
  - "migrations/**"
max_comments: 20         # Cap inline comments per PR
```

---

## 6. Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Runtime | GitHub Actions (Node.js 20) |
| Language | TypeScript |
| LLM APIs | OpenAI GPT-4o (primary), Anthropic Claude 3.5 (fallback) |
| GitHub API | Octokit REST + GitHub Review API |
| Secret Pre-scan | Regex patterns + `gitleaks` CLI (bundled) |
| Config | `.pr-copilot.yml` in repo root |
| Rate limiting | Exponential backoff with jitter |
| Token management | Diff truncation to 8k tokens per agent call |

### Data Flow

```
PR Event (GitHub Webhook)
        │
        ▼
[GitHub Action Runner]
        │
        ├─► Fetch diff (Octokit)
        │
        ├─► Pre-scan secrets (gitleaks regex)
        │
        ├─► Chunk diff (max 8k tokens/chunk)
        │
        ▼
[Parallel LLM Calls — Promise.all()]
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │ Security    │  │  Quality    │  │  Coverage   │
  │ Agent       │  │  Agent      │  │  Agent      │
  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
         └────────────────┼────────────────┘
                          │
                    [Synthesis LLM]
                          │
              ┌───────────┴───────────┐
              │                       │
        [Inline Comments]      [Summary Comment]
        (Review API)           (Issues API)
```

### Cost Estimation (per PR)

| Model | Avg tokens/PR | Avg cost/PR |
|-------|--------------|-------------|
| GPT-4o | ~12,000 input + ~2,000 output | ~$0.04 |
| Claude 3.5 Sonnet | ~12,000 input + ~2,000 output | ~$0.036 |

At 20 PRs/day, monthly cost ≈ $24 — well within a $50/month budget.

---

## 7. Implementation Phases

### Phase 1 — MVP (Week 1–2)
- GitHub Action scaffold with `pull_request` trigger
- Diff fetching and chunking via Octokit
- Single LLM call (quality + security combined prompt)
- Summary comment posting
- `.pr-copilot.yml` config parsing
- TypeScript + JavaScript support

**Deliverable:** Working GitHub Action that posts a summary comment on every PR.

### Phase 2 — Multi-Agent (Week 3)
- Split into parallel Security / Quality / Coverage agents
- Inline suggestion comments via Review API
- Secret pre-scan with regex (gitleaks patterns)
- Risk score calculation and recommendation label

**Deliverable:** Full inline review with risk score, working on real repos.

### Phase 3 — Coverage & Polish (Week 4)
- Test coverage delta parsing (`coverage.json` artifact)
- Python and Go language support
- `max_comments` cap and severity filtering
- README, demo video, GitHub Marketplace listing

**Deliverable:** Published GitHub Action, ready for Ideathon submission.

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Time from PR open to first comment | < 60 seconds |
| Critical security issue detection rate | > 85% on test suite |
| False positive rate (security) | < 15% |
| User-applied suggestions rate | > 30% |
| Action execution cost per PR | < $0.10 |
| Setup time (install + first working review) | < 10 minutes |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| LLM hallucinated false positives flood PR with noise | Medium | High | Severity threshold config; cap max comments; prompt engineering for precision |
| API rate limits on large repos with many PRs | Low | Medium | Queue with exponential backoff; cache diff context |
| Token limit exceeded on large diffs | Medium | Medium | Diff chunking + prioritize changed lines over context |
| OpenAI API outage | Low | High | Fallback to Anthropic Claude in config |
| GitHub API permissions not granted | Medium | High | Clear setup docs; Action permission declaration in `action.yml` |

---

## 10. Pitch Framing (Ideathon)

**Headline:** "A developer, for developers — save 30–90 minutes of review time on every PR."

**Key differentiators to highlight:**
- Multi-agent coordination (not a single prompt, but a pipeline of specialized agents)
- Actionable inline suggestions — one-click apply, not just complaints
- Cost-efficient by design: uses APIs, no hosting, ~$0.04/PR
- Fully configurable — suppress noise, set thresholds, pick your model
- Works in 10 minutes: one GitHub Action YAML block

**Live demo flow:**
1. Open a PR with a hardcoded secret + an untested async function
2. Show the Action running in real-time (< 60s)
3. Show the summary comment with risk score
4. Show the inline suggestion — click "Apply suggestion"
5. Show the `.pr-copilot.yml` config toggle (disable a check live)

---

## 11. Open Questions

- Should the Action re-review on every new commit push, or only on PR open? (Config toggle needed)
- For public repos, should a free tier be offered with GPT-3.5 to reduce cost barrier?
- Should the risk score be posted as a GitHub Check Run (affects merge gating) or only as a comment?
- Localization: should review comments support non-English explanation mode for global contributors?

---

*Document end. Next step: Phase 1 scaffold — GitHub Action YAML + Octokit diff fetcher.*
