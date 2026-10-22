# session-hud

**The simplest status band: one green line above your prompt.**

Session tokens, cost at API prices, context window use, the current task, connection status and the active model, in one line.

## How it saves tokens

It makes cost and context visible at a glance, so you notice a bloated session early. It does not change what Claude does.

## Using it

- Install it and the band appears. No setup.
- To change the color or switch parts off, edit the **Easy settings** block at the top of `hooks/register.tsx`, then restart Claude Code.

## Settings

None in the menu; the file edit above is the only setting. Use `hud` or `info-card` if you want a settings menu.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install session-hud@efficiency-marketplace
```

## Limits

Costs are API-equivalent estimates. The task shown is the start of your prompt, with no AI title. Overlaps with `hud` and `info-card`; install one display, not all three.

MIT licensed.
