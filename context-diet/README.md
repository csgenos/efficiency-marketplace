# context-diet

Everything in your context window before you type is re-read on **every** turn: the system prompt, MCP tool listings, skill and agent descriptions, memory files. Install a lot of plugins and that standing load gets big.

Type **`/diet`** to see it ranked: totals by category, then the biggest MCP servers, skills, agents and memory files.

Then cut what you do not use: `/plugin disable` a plugin for the project, `/mcp` to switch off a server, or trim a memory file. Disabled items stop costing tokens on every turn.

## Settings

`/config` → **context-diet**: how many rows each list shows, and the percentage of the window at which the total turns red.

## Install

```
/plugin install context-diet --marketplace csgenos/efficiency-marketplace
```

## Limits

Read-only: it reports and suggests, it does not disable anything for you. Token figures are the engine's estimates. Tools loaded on demand are not counted until they are used.
