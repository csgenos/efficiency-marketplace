# smart-compact

**Compaction that keeps what matters and costs less: a structured summary written by Haiku, your recent messages kept word for word, and a handoff file on disk.**

## Why it exists

When a conversation gets long, Claude Code compacts it: the old messages are replaced by a summary. Built-in compaction has the session's own model write that summary, often your most expensive model, in free form. Two things go wrong:

- **Cost:** the summarizer reads the whole conversation at your main model's price.
- **Drift:** a free-form summary can flatten "never touch README files" into nothing, lose an exact error message, or forget a decision, and Claude repeats work or breaks a rule after compaction.

`smart-compact` takes over the summary step.

## What it does

In the default **haiku** mode, at every compaction (yours with `/compact`, or Claude Code's automatic one):

1. Splits the conversation at a safe point: the latest real prompt that leaves your last messages (8 by default) whole, never between a tool call and its result.
2. Sends everything before that point to **Haiku**, with tool output clipped, and asks for a fixed structure:
   - **Goal**
   - **User instructions and preferences**, close to your words; never dropped
   - **Decisions**, with reasons
   - **Done**, and how it was verified
   - **Files and identifiers**: exact paths, names, commands, IDs
   - **Open problems**, with exact error text
   - **State**: anything running or temporarily changed
   - **Next step**
3. Replaces the old messages with that summary and keeps the recent ones verbatim.
4. Saves the summary to `.claude/handoff.md`, so you can also `/clear` and start a fresh session from it.

If anything goes wrong (Haiku times out, the summary is thin or missing its sections, no safe split point), it falls back to Claude Code's own compaction, told to use the same structure. A compaction never fails because of this plugin.

`/compact focus on the auth bug` still works: your focus text is passed to the summarizer.

## Modes

| Mode | Who writes the summary | When to use |
|---|---|---|
| `haiku` (default) | Haiku, structured; recent messages kept whole | Lowest cost, strongest retention of instructions |
| `steer` | Your main model, told to use the structure | You want the main model's judgment and accept its cost |
| `off` | Claude Code, unchanged | Turn the plugin off without uninstalling |

## Settings

Open `/config` and find **smart-compact**.

| Setting | Default | What it does |
|---|---|---|
| Mode | haiku | See above |
| Recent messages kept whole | 8 | At least this many of the latest messages stay word for word (fewer in a very short session) |
| Save summary to .claude/handoff.md | on | Also write the summary to a file |
| Compact early at % of context | 0 (off) | Compact on its own once context passes this percent, so later turns are cheaper. Interactive sessions only |

## Measured

On the `compact-recall` task of the [benchmark](../bench/README.md) (Sonnet, two edits, then `/compact`, then a recall question): **$0.174 against $0.237 for built-in compaction (27% less)**, with every standing instruction and identifier recalled correctly in both. Two runs per config; see the benchmark for the full table.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install smart-compact@efficiency-marketplace
```

## Limits

- Haiku is a smaller model. The fixed structure and the "never drop an instruction" rule exist to cover that, and the fallback catches empty or malformed output, but a subtle point can still be lost. Use `steer` mode if you see that.
- `.claude/handoff.md` covers the summarized part; the recent messages kept in the session are not in it.
- Early compaction cannot be triggered by a plugin in headless (`-p`) sessions; there, `/compact` as a prompt still uses this plugin.
- Subagents' own compactions are left to Claude Code.

Unit tests: `node --test smart-compact/tests/*.test.ts` (Node 22.6 or later).

MIT licensed.
