# Graph Report - PR REVIEW COPILET  (2026-06-26)

## Corpus Check
- 35 files · ~12,446 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 234 nodes · 366 edges · 15 communities (12 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77ebd05f`
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
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `Product Requirements Document` - 13 edges
3. `runReview()` - 11 edges
4. `Finding` - 9 edges
5. `Code Review: [PR Title / Feature Name]` - 9 edges
6. `scripts` - 7 edges
7. `ChangedFile` - 7 edges
8. `main()` - 7 edges
9. `🤖 PR Review Copilot` - 7 edges
10. `5. Feature Specifications` - 7 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `loadConfig()`  [EXTRACTED]
  src/index.ts → src/config/load-config.ts
- `main()` --calls--> `runReview()`  [EXTRACTED]
  src/dry-run.ts → src/review/run-review.ts
- `InlineReviewResult` --references--> `Finding`  [EXTRACTED]
  src/github/post-review.ts → src/schemas/index.ts
- `main()` --calls--> `createProvider()`  [EXTRACTED]
  src/index.ts → src/llm/factory.ts
- `main()` --calls--> `runReview()`  [EXTRACTED]
  src/index.ts → src/review/run-review.ts

## Import Cycles
- None detected.

## Communities (15 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (36): Agent, AGENTS, buildAgentSystemPrompt(), JSON_CONTRACT, InlineReviewResult, buildSystemPrompt(), buildUserPrompt(), renderDiff() (+28 more)

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
Cohesion: 0.17
Nodes (18): commentableLines(), commentableLinesByFile(), extensionsFor(), getChangedFiles(), isFileInScope(), LANGUAGE_EXTENSIONS, Octokit, capitalize() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (11): enrichGeminiError(), GeminiProvider, parseReviewResponse(), stripCodeFence(), ProviderOptions, ReviewProvider, ReviewRequest, RetryOptions (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (14): (advanced), 🟡 ARCHITECTURAL TRANSFORMATIONS (Significant Impact), C1: [Title] - [Severity: BLOCKER], Code Review: [PR Title / Feature Name], 🎯 CONTEXT ASSESSMENT, 🔴 CRITICAL FINDINGS (Must Fix Before Merge), Key Improvements Made:, 🎓 MENTORSHIP INSIGHT (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.25
Nodes (10): loadConfig(), tmpFiles, Config, configSchema, DEFAULT_CONFIG, createProvider(), severitySchema, main() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (8): Configuration — `.pr-copilot.yml`, How it works, License, Local development, 🤖 PR Review Copilot, Project layout, Quick start (use it on your repo), Roadmap

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): Architecture & Context, Data flow (V1), Invariants / gotchas, Key design decisions, Module map, Roadmap context

### Community 13 - "Community 13"
Cohesion: 0.70
Nodes (3): escapeRegExpChar(), globToRegExp(), minimatch()

## Knowledge Gaps
- **106 isolated node(s):** `PreToolUse`, `allow`, `name`, `version`, `description` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChangedFile` connect `Community 4` to `Community 0`, `Community 7`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `allow`, `name` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07918367346938776 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._