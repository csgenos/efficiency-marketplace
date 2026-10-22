# hud

**A closable status band or card above your prompt, with a settings pane.**

Shows context window use, session cost at API prices, last-run cost and time, tokens, model, connection status and the current task, as a one-line **band** or a bordered **card**.

## How it saves tokens

It keeps context fill and cost visible, so you can compact or clear before the window is full and see which prompts were expensive. It does not change what Claude does.

## Using it

- It appears in every session after install.
- `/hud` opens the settings pane. `/hud hide` and `/hud show` toggle it, or click the `✕` at the end of the display.
- On a narrow terminal the end of the line is cut off, so the most important items come first.

## Settings

`/hud` pane: band or card, color, a switch for each item, and AI task titles (off by default). Settings are saved across sessions.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install hud@efficiency-marketplace
```

## Limits

Costs are API-equivalent estimates. It overlaps with `info-card` and `session-hud`; install one display, not all three. Choose `hud` if you want it hideable, `info-card` if you want the ledger and cache health.

MIT licensed.
