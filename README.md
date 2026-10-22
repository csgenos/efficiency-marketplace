<div align="center">

# ⚡ efficiency-marketplace

**See what Claude Code costs you, and spend less of it.**

Status displays for cost, tokens and context, plus cheap read-only Haiku subagents.

![plugins](https://img.shields.io/badge/plugins-6-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![claude code](https://img.shields.io/badge/Claude%20Code-plugin%20marketplace-orange)

</div>

## Why this exists

Claude Code usage is mostly **context**: everything in the conversation is re-read on every turn, so one oversized tool result, one repeated file read or one forgotten MCP server is paid for again and again. These plugins attack that without making answers worse: they make the cost visible, keep duplicate text out of context, and move bulk reading to a cheaper model. None of them changes how Claude writes code or answers.

## Quick start

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install info-card@efficiency-marketplace
```

Then run `/reload-plugins` (or restart Claude Code).

## Plugins

| Plugin | What you get | Settings |
|---|---|---|
| 📊 **[info-card](info-card)** | Live card above the prompt: cost, 5-hour limit, tokens, context fill, cache health, current task. `/ledger` adds cost per prompt (with character counts), spend by tool and cache detail. Optional idle-cache nudge, off until you switch it on | `/config` → info-card |
| 🥗 **[context-diet](context-diet)** | `/diet` ranks what fills your context before you type: MCP servers, skills, agents, memory files | `/config` → context-diet |
| 🛡️ **[context-guard](context-guard)** | Blocks re-reads of file lines already in context, and trims long Bash/PowerShell output to its errors, head and tail, saving the full text to a file. **-27% context** on a long-output task | `/config` → context-guard |
| 🗜️ **[smart-compact](smart-compact)** | Compaction written by Haiku in a fixed structure that keeps your instructions, decisions and exact identifiers; recent messages kept whole; handoff file saved. **-27% cost** on a compacting session | `/config` → smart-compact |
| 🧠 **[lean-skills](lean-skills)** | Three skills that make Claude search lean, scope edits first and hand off long sessions: `lean-search`, `scope-first`, `handoff` | Edit the `SKILL.md` files |
| 🪶 **[haiku-agents](haiku-agents)** | Three read-only Haiku subagents: `finder`, `scoper`, `junior` | Edit the agent files |

Install any of them the same way:

```
/plugin install <plugin>@efficiency-marketplace
```


## Measured

Every plugin is checked by a [benchmark](bench/README.md): fixed tasks run headless with and without the plugins, isolated from your own settings, checked pass/fail. Every run of every configuration passed. Where the plugins apply, `smart-compact` cut a compacting session's cost by 27% and `context-guard` cut context by 27% on a long-output task; where they do not, the overhead is 1-2%. Small samples, one model: read the limits there.

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
- `info-card` can name each task with one small Haiku call per prompt ("AI task titles", on by default). It uses a little extra usage; turn it off in settings if you prefer.
- `lean-skills` works best with `haiku-agents` and `context-guard` installed: the skills tell Claude when to use them.
- Subagents are picked by Claude from each agent's `description`, so delegation is likely, not guaranteed. You can always ask for one by name.

## Contributing

Issues and pull requests are welcome. Run `claude plugin validate .` before opening a PR.

## License

[MIT](LICENSE) © csgenos
