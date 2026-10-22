# Benchmark

Fixed tasks, run headless with and without the plugins, checked pass/fail by a script. Every run gets a fresh copy of the task's files and loads **no** user settings, installed plugins or MCP servers; only the plugins being tested are added with `--plugin-dir`.

```
python bench/run.py --configs baseline,context-guard,smart-compact,all --runs 2 --model sonnet
```

Raw results are saved to `bench/results/<timestamp>.json`.

## Tasks

| Task | What Claude has to do | What it exercises |
|---|---|---|
| `noisy-build` | Run a build that prints 4,000 lines with one warning buried in it, and fix the cause | Long command output |
| `lint-fix` | Run a linter that prints ~2,000 lines (82KB) with 3 problems scattered through it, fix all 3 | Long output, problems spread out |
| `fix-bug` | Find and fix one bug in a 780-line file so a test passes | Reading a large file in parts |
| `find-usages` | List every file of 60 that calls a function (not ones that only mention it) | Broad search |
| `compact-recall` | Two edits under three standing rules, then `/compact`, then recall the rules and identifiers | Compaction |

## Results

Sonnet 5.5, 2 runs per cell, medians. Context tokens = all input tokens read across the run (cached and uncached), the figure that grows with what sits in context.

| Task | Config | Passed | Cost | Context tokens |
|---|---|---|---|---|
| compact-recall | baseline | 2/2 | $0.237 | 124,704 |
| compact-recall | context-guard | 2/2 | $0.246 | 125,288 |
| compact-recall | **smart-compact** | 2/2 | **$0.174 (-27%)** | 124,436 |
| compact-recall | all | 2/2 | $0.182 (-23%) | 127,424 |
| lint-fix | baseline | 2/2 | $0.059 | 143,690 |
| lint-fix | **context-guard** | 2/2 | **$0.049 (-17%)** | **105,434 (-27%)** |
| lint-fix | smart-compact | 2/2 | $0.059 | 143,936 |
| lint-fix | all | 2/2 | $0.049 (-17%) | 106,922 (-26%) |
| noisy-build | baseline | 2/2 | $0.046 | 87,244 |
| noisy-build | context-guard | 2/2 | $0.044 | 95,741 (+10%) |
| noisy-build | smart-compact | 2/2 | $0.050 | 107,264 (+23%) |
| noisy-build | all | 2/2 | $0.045 | 86,723 (-1%) |
| fix-bug | baseline | 2/2 | $0.078 | 81,474 |
| fix-bug | context-guard | 2/2 | $0.078 | 81,484 |
| fix-bug | smart-compact | 2/2 | $0.078 | 81,472 |
| fix-bug | all | 2/2 | $0.080 | 82,989 (+2%) |
| find-usages | baseline | 2/2 | $0.033 | 41,066 |
| find-usages | context-guard | 2/2 | $0.032 | 41,070 |
| find-usages | smart-compact | 2/2 | $0.032 | 41,060 |
| find-usages | all | 2/2 | $0.034 | 42,088 (+2%) |

Every run of every config passed its check: no plugin made the result worse.

## What this shows

- **`smart-compact` saves about a quarter of a session that compacts** ($0.237 to $0.174), with every rule and identifier still recalled after compaction. The saving is the summary being written by Haiku instead of Sonnet.
- **`context-guard` cuts context by about a quarter when long output reaches Claude** (`lint-fix`: 143k to 105k context tokens, cost -17%). Claude Code passes only the first 2KB of an 82KB output; `context-guard` passes the three problems instead, which saves Claude a round of searching.
- **No effect when Claude already filters.** On `noisy-build` and `fix-bug`, Sonnet piped output through `head`/`grep` and read ranges on its own, so there was nothing to trim. The `noisy-build` swings (+10%, +23%) are run-to-run noise from Claude choosing a different number of steps (4 to 6), not the plugins: `smart-compact` does nothing in a task without compaction.
- **Fixed overhead of `all`: about 1-2%** (skill and agent descriptions in context) on tasks where nothing triggers.

## Limits

- Two runs per cell is a small sample; differences under ~10% on a single task are within noise.
- Single-session tasks under 3 minutes. Long real sessions, where re-reads and large outputs pile up over hours, are not measured here.
- One model (Sonnet). Weaker models filter output less on their own and would likely gain more from `context-guard`; untested.
- `haiku-agents` and `lean-skills` are only in the `all` config; on these small tasks Claude did not delegate, so their effect is not shown.
