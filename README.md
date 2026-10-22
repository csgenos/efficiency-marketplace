# efficiency-marketplace

Claude Code plugins for keeping an eye on usage and spending less of it.

| Plugin | What it does |
|---|---|
| `info-card` | Bordered card above the prompt: cost, tokens, context fill, 5-hour limit, current task. Settings in `/config`. |
| `hud` | Band or card above the prompt with `/hud` settings pane. |
| `session-hud` | Simple green band above the prompt. |
| `haiku-agents` | Cheap read-only Haiku subagents: finder, scoper, junior. |

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install info-card@efficiency-marketplace
/plugin install haiku-agents@efficiency-marketplace
```

Costs shown are API-equivalent estimates, not what a subscription charges. `info-card` and `hud` can optionally name tasks with a small Haiku call per prompt (setting "AI task titles").

MIT licensed.
