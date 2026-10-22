# context-diet

**See what fills your context before you type, ranked by cost.**

`/diet` opens a pane with the standing context: totals by category, then the biggest MCP servers, skills, agents and memory files.

## How it saves tokens

System prompt, tool and skill listings, agent descriptions and memory files are sent on every turn. Install many plugins and that load grows. Ranking it shows what to switch off: `/plugin disable` a plugin you do not use in this project, `/mcp` to switch off a server, or trim a memory file. Disabled items stop costing tokens on every turn.

## Using it

Type `/diet`. **Re-measure** refreshes the figures after you change something.

## Settings

`/config` → **context-diet**: how many rows each list shows, and the percentage of the window at which the total turns red.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install context-diet@efficiency-marketplace
```

## Limits

Read-only: it reports and suggests, and disables nothing. Figures are the engine's estimates. Tools loaded on demand are not counted until used.

MIT licensed.
