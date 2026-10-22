# haiku-agents

**Three read-only Haiku subagents that keep searching and checking out of your main context.**

- **finder**: locates files, symbols and usages, returning paths with line numbers.
- **scoper**: before a multi-file edit, lists every affected file and test, plus risks.
- **junior**: runs a well-specified task with an objective check and reports a PASS/FAIL table.

## How it saves tokens

Their work runs on Haiku, which costs far less than the main model, and only the short report returns to your conversation. The pages of search output stay out of your context, so they are not re-read on every later turn. They are read-only, so they cannot cause a bad edit.

## Using it

Claude picks them from their descriptions, usually before a broad search or a multi-file change. To be sure, name one: "use scoper first".

Optional: add `"env": { "CLAUDE_CODE_SUBAGENT_MODEL": "haiku" }` to `~/.claude/settings.json` so every other subagent without an explicit model also runs on Haiku.

## Settings

Edit the agent files in `agents/` to change a model, effort or the rules.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install haiku-agents@efficiency-marketplace
```

## Limits

Delegation is likely, not guaranteed. A Haiku agent can miss subtle things, so use `scoper`'s list as a starting point, not a final answer.

MIT licensed.
