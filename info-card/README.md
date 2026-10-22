# info-card

A bordered card above the prompt: total and last-run cost, 5-hour limit, tokens, last-run time, context fill and the current task. No setup needed.

Costs are API-equivalent figures, not what a subscription charges.

## Spend ledger (`/ledger`)

Type `/ledger` for a submenu with two sections:

- **Cache health:** how much of the last response, and of the whole session, was read from the prompt cache, how many minutes the cache has left, and a warning once you have been idle past its lifetime. A cold cache re-bills the whole context at the write price on your next prompt.
- **Tool results in context:** estimated tokens by tool, biggest first. Every result stays in context and is re-read each turn, so the top rows are where trimming pays most.

`/ledger reset` clears it. The card also shows a short `Cache 92%` (or `Cache cold`) item; switch it off in settings. Set the cache lifetime to 60 if your plan uses the 1-hour cache.

## Settings

Open the config menu (`/config`) and find **info-card**. Every part is a row you can toggle, plus a color picker, AI task titles (off by default: one small Haiku call per prompt) and the context-warning percent. A change reloads the card immediately; nothing to edit by hand.

On a narrow terminal the end of the line is cut off, so the most important items come first.

## Install

```
/plugin install info-card --marketplace csgenos/efficiency-marketplace
```
