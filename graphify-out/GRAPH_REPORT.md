# Graph Report - PR REVIEW COPILET  (2026-06-26)

## Corpus Check
- 29 files · ~10,420 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 203 nodes · 297 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e6a0b5f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `Product Requirements Document` - 13 edges
3. `runReview()` - 9 edges
4. `Code Review: [PR Title / Feature Name]` - 9 edges
5. `scripts` - 7 edges
6. `🤖 PR Review Copilot` - 7 edges
7. `5. Feature Specifications` - 7 edges
8. `loadConfig()` - 6 edges
9. `main()` - 6 edges
10. `Architecture & Context` - 6 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `loadConfig()`  [EXTRACTED]
  src/index.ts → src/config/load-config.ts
- `main()` --calls--> `runReview()`  [EXTRACTED]
  src/dry-run.ts → src/review/run-review.ts
- `main()` --calls--> `createProvider()`  [EXTRACTED]
  src/index.ts → src/llm/factory.ts
- `main()` --calls--> `runReview()`  [EXTRACTED]
  src/index.ts → src/review/run-review.ts
- `main()` --calls--> `loadConfig()`  [EXTRACTED]
  src/dry-run.ts → src/config/load-config.ts

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (24): buildSystemPrompt(), buildUserPrompt(), renderDiff(), truncate(), assessRisk(), RECOMMENDATION_LABEL, renderCategoryTable(), renderSummaryComment() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (29): author, dependencies, @actions/core, @actions/github, @google/genai, yaml, zod, description (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (27): 10. Pitch Framing (Ideathon), 11. Open Questions, 1. Executive Summary, 2. Problem Statement, 3. Goals & Non-Goals, 4. User Stories, 5.1 Core Review Engine, 5.2 Security Analysis (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (22): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (14): extensionsFor(), getChangedFiles(), isFileInScope(), LANGUAGE_EXTENSIONS, Octokit, escapeRegExpChar(), globToRegExp(), minimatch() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (11): ProviderName, GeminiProvider, parseReviewResponse(), stripCodeFence(), ProviderOptions, ReviewProvider, ReviewRequest, RetryOptions (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (14): (advanced), 🟡 ARCHITECTURAL TRANSFORMATIONS (Significant Impact), C1: [Title] - [Severity: BLOCKER], Code Review: [PR Title / Feature Name], 🎯 CONTEXT ASSESSMENT, 🔴 CRITICAL FINDINGS (Must Fix Before Merge), Key Improvements Made:, 🎓 MENTORSHIP INSIGHT (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (9): loadConfig(), tmpFiles, Config, configSchema, DEFAULT_CONFIG, createProvider(), main(), parseFilesArg() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (8): Configuration — `.pr-copilot.yml`, How it works, License, Local development, 🤖 PR Review Copilot, Project layout, Quick start (use it on your repo), Roadmap

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): Architecture & Context, Data flow (V1), Invariants / gotchas, Key design decisions, Module map, Roadmap context

## Knowledge Gaps
- **103 isolated node(s):** `PreToolUse`, `name`, `version`, `description`, `author` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `PreToolUse`, `name`, `version` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11491935483870967 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._