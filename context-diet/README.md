# context-diet

**See what fills your context before you type, ranked by cost.**

## Why it exists

Before you send a word, every turn already carries a fixed load: the system prompt, the list of every tool, skill and agent, and your memory files. That load is re-read on every single turn. Install a lot of plugins and MCP servers and it quietly grows into thousands of tokens you pay for each time, whether or not you use them. Nothing shows you this. `context-diet` does.

## What you get

Type **`/diet`** to open a pane with:

- **Standing context:** the total in tokens and as a share of the window, turning red above the warning percent.
- **By category:** system prompt, system tools, memory files, skills and so on, biggest first.
- **MCP servers:** each server's loaded tools added up, with the tool count.
- **Skills, Agents, Memory files:** the biggest entries of each.

The *Re-measure* button refreshes the figures after you change something.

## What to do with it

It reports and suggests; it never changes anything.

- Disable a plugin you do not use in this project: `/plugin disable <name>`.
- Switch off an MCP server: `/mcp`.
- Trim or split a large memory file.

Disabled items stop costing tokens on every turn. Run `/reload-plugins` afterwards, and `/diet` again to see the difference.

## Settings

Open `/config` and find **context-diet**.

| Setting | Default | What it does |
|---|---|---|
| Rows per list | 6 | How many of the biggest entries each list shows |
| Warn above (% of window) | 10 | Marks the standing total red above this share. `0` turns the warning off |

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install context-diet@efficiency-marketplace
```

## Limits

- Figures are the engine's estimates, not exact bills.
- Tools that load on demand are not counted until they are used.
- It cannot tell which items you actually use, only what they cost. That decision is yours.

MIT licensed.
