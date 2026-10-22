# info-card

**A live spend card above your prompt, with a spend ledger and cache health one command away.**

A bordered card above the prompt showing total and last-run cost, 5-hour limit, tokens, last-run time, context fill, prompt-cache health and the current task. `/ledger` opens a submenu with the detail.

## How it saves tokens

You cannot spend less of what you cannot see. The card keeps cost and context in view, turns the context figure red before the window fills, and flags a cold prompt cache (a cold cache re-bills the whole context at the write price). `/ledger` ranks tool results by estimated size, so you know which ones to trim.

## Using it

- Install it and the card appears. No setup.
- `/ledger` has three sections. **Cost per prompt** lists your last 20 prompts with cost, length in characters and task title (the AI title when AI task titles are on, otherwise the start of the prompt); the cost fills in when the response finishes. **Cache health** (hit rate of the last response and of the session, minutes left, a warning once idle past the cache lifetime) and **Tool results in context** (estimated tokens by tool, biggest first). `/ledger reset` clears it.
- **Idle cache nudge (off by default):** switch it on in `/config`. A background check, with no requests sent, shows a notice shortly before the cache expires, so a quick prompt can keep it warm. It shows once per response.
- Task titles: each prompt gets a 2-4 word label from one small Haiku call. Slash commands and prompts of four words or fewer skip the call.

## Settings

`/config` → **info-card**: color, a toggle for each item, AI task titles (on by default), the context warning percent and the cache lifetime (5 minutes by default; use 60 if your plan uses the 1-hour cache).

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install info-card@efficiency-marketplace
```

## Limits

Costs are API-equivalent estimates, not what a subscription charges. Tool-result sizes are estimated at about four characters per token. AI titles cost one small Haiku call per qualifying prompt; turn them off in settings if you would rather not.

MIT licensed.
