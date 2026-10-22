# haiku-agents

**Three read-only Haiku subagents that keep searching and checking out of your main context.**

## Why it exists

Searching a codebase is mostly reading. Done in your main conversation, every file listing and search result lands in context and is re-read on every later turn, on the most expensive model. A subagent does that reading in its own separate context, on a cheaper model, and hands back only a short report. The pages of output never enter your conversation.

## The agents

| Agent | Use it for | Tools | Effort |
|---|---|---|---|
| `finder` | Locating files, symbols, call sites and usages ("where is X", "what uses X"). Returns paths with line numbers, under 300 words | Read, Grep, Glob, Bash | low |
| `scoper` | Before a multi-file edit, a refactor, a rename or a new feature. Lists every affected file and test, why, and a Risks section, under 500 words | Read, Grep, Glob | medium |
| `junior` | A self-contained task with an objective pass/fail check, such as running tests or verifying a claim. Reports a PASS/FAIL table, the answer and the commands run | Read, Grep, Glob, Bash | medium |

All three run on Haiku and are read-only: none of them edits, creates or deletes files. `junior` and `finder` may run only read-only shell commands, and `junior` reports `CANNOT: requires write access` instead of writing.

## How they get used

Each agent's description tells Claude when to call it, so it usually delegates on its own before a broad search or a multi-file change. That is likely, not guaranteed. To be sure, name one: "use scoper first".

## Settings

There is no menu: a plugin cannot change an agent's model through settings. To change a model, effort, tool list or rule, edit the agent's file in `agents/`.

**Optional, outside the plugin:** a plugin cannot set environment variables, so to make every other subagent without an explicit model also run on Haiku, add this to `~/.claude/settings.json` yourself:

```json
{
  "env": { "CLAUDE_CODE_SUBAGENT_MODEL": "haiku" }
}
```

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install haiku-agents@efficiency-marketplace
```

## Limits

- A Haiku agent can miss subtle things. Treat `scoper`'s list as a starting point, not a final answer.
- Each agent call has a small fixed overhead, so for a single known file, reading it directly is cheaper.
- The Haiku default setting above also affects subagents from other plugins.

MIT licensed.
