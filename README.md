<div align="center">

# ⚡ efficiency-marketplace

**See what Claude Code costs you, and spend less of it.**

Status displays for cost, tokens and context, plus cheap read-only Haiku subagents.

![plugins](https://img.shields.io/badge/plugins-6-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![claude code](https://img.shields.io/badge/Claude%20Code-plugin%20marketplace-orange)

</div>

## Quick start

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install info-card@efficiency-marketplace
```

Then run `/reload-plugins` (or restart Claude Code).

## Plugins

| Plugin | What you get | Settings |
|---|---|---|
| 📊 **[info-card](info-card)** | Bordered card above the prompt: cost, 5-hour limit, tokens, run time, context fill, cache health, current task. `/ledger` shows spend by tool and cache details | `/config` → info-card |
| 🎛️ **[hud](hud)** | Band or card above the prompt, closable and reopenable | `/hud` |
| 🟩 **[session-hud](session-hud)** | Minimal green band: tokens, cost, context, task, model | Edit `hooks/register.tsx` |
| 🥗 **[context-diet](context-diet)** | `/diet` ranks what fills your context before you type: MCP servers, skills, agents, memory files | `/config` → context-diet |
| 🛡️ **[reread-guard](reread-guard)** | Refuses to re-read an unchanged file that is already in context | `/config` → reread-guard |
| 🪶 **[haiku-agents](haiku-agents)** | Three read-only Haiku subagents: `finder`, `scoper`, `junior` | Edit the agent files |

Install any of them the same way:

```
/plugin install <plugin>@efficiency-marketplace
```

> The three display plugins all draw above the prompt. Pick one.

## Make subagents run on Haiku by default

`haiku-agents` pins its own three agents to Haiku. To make **every** subagent without an explicit model default to Haiku too, add this to `~/.claude/settings.json`:

```json
{
  "env": { "CLAUDE_CODE_SUBAGENT_MODEL": "haiku" }
}
```

A plugin cannot set environment variables for you, so this one is a manual step.

## Good to know

- Costs shown are **API-equivalent estimates**, not what a subscription charges.
- `info-card` and `hud` can name each task with one small Haiku call per prompt ("AI task titles", on by default in `info-card`, off in `hud`). It uses a little extra usage; turn it off in settings if you prefer.
- Subagents are picked by Claude from each agent's `description`, so delegation is likely, not guaranteed. You can always ask for one by name.

## Contributing

Issues and pull requests are welcome. Run `claude plugin validate .` before opening a PR.

## License

[MIT](LICENSE) © csgenos
