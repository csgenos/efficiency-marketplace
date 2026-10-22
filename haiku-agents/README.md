# haiku-agents

Three read-only subagents that run on Haiku, so searching and checking cost little and stay out of your main context.

- **finder**: locates files, symbols and usages.
- **scoper**: lists every file and test an edit will touch, plus risks, before you change anything.
- **junior**: runs a well-specified task with a pass/fail check and reports a table.

Claude delegates to them on its own based on their descriptions, or name one in your prompt ("use scoper first").

Optional: add `"env": { "CLAUDE_CODE_SUBAGENT_MODEL": "haiku" }` to your `settings.json` so any subagent without an explicit model also runs on Haiku.

## Install

```
/plugin install haiku-agents --marketplace csgenos/efficiency-marketplace
```
