# lean-skills

**Three small skills that make Claude search, scope and reset sessions the cheap way.**

## Why it exists

The other plugins in this marketplace give Claude cheap tools: Haiku subagents, a re-read guard, a spend ledger. A tool only helps if it gets used. These skills are short instruction sets that tell Claude when to reach for them, so the savings happen by habit rather than by luck. They change how Claude works, not how well: every skill says when to skip it, and none trades away correctness.

## The skills

| Skill | Use it when | What it does |
|---|---|---|
| `lean-search` | Exploring a codebase to find files, symbols or usages | Search before reading. Delegate broad sweeps to the `finder` agent. Read line ranges instead of whole files, never read a file twice, trim long command output, stop once answered |
| `scope-first` | Before any edit touching more than one file, a refactor, a rename or a new feature | Calls the `scoper` agent for every affected file and test, checks the list, edits from it, then ticks everything off and runs related tests. Skipped for one-file trivial edits |
| `handoff` | A long session should be reset, context is getting full, or you say "handoff" | Writes a short summary (goal, done, decisions, files, state, next step) to `.claude/handoff.md`, then tells you to `/clear` and start the next session by reading it |

## How they trigger

Claude loads a skill when its one-line description matches what you are doing, so triggering is likely, not guaranteed. To be sure, name it: "use scope-first", or type `/lean-skills:handoff`.

Each skill's description is the only part that sits in context on every turn, and it is one sentence. The body loads only when the skill is used.

## Works best with

- **`haiku-agents`**, which provides `finder` and `scoper`. Without it, `lean-search` falls back to the built-in `Explore` agent or searching directly, and `scope-first` does the scoping itself with Grep.
- **`context-guard`**, which enforces the "never read twice" rule that `lean-search` asks for.
- **`info-card`**, whose context warning is a good moment to run `handoff`.
- **`smart-compact`**, which writes the same handoff structure automatically at every compaction.

## Settings

None. A skill is plain text. To change what a skill does, edit its `SKILL.md` in `skills/<name>/`.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install lean-skills@efficiency-marketplace
```

## Limits

- Skills are guidance, not enforcement. For a hard guarantee, use a hook such as `context-guard`.
- `handoff` cannot clear the session for you; you run `/clear` yourself. It writes `.claude/handoff.md` into the project, so add it to `.gitignore` if you do not want it tracked.
- I have not measured how much these save. Check `/ledger` over a session or two.

MIT licensed.
