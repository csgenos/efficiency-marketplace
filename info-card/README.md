# info-card

A bordered card above the prompt: total and last-run cost, 5-hour limit, tokens, last-run time, context fill and the current task. No setup needed.

Costs are API-equivalent figures, not what a subscription charges.

## Settings

Open the config menu (`/config`) and find **info-card**. Every part is a row you can toggle, plus a color picker, AI task titles (off by default: one small Haiku call per prompt) and the context-warning percent. A change reloads the card immediately; nothing to edit by hand.

On a narrow terminal the end of the line is cut off, so the most important items come first.

## Install

```
/plugin install info-card --marketplace csgenos/efficiency-marketplace
```
