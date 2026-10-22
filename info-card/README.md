# info-card

**A live spend card above your prompt, with a spend ledger and cache health one command away.**

## Why it exists

You cannot spend less of what you cannot see. Claude Code hides three things that decide most of your usage: how full the context window is, what each prompt cost, and whether the prompt cache is still warm. `info-card` puts all three where you can see them, and it never changes what Claude does or says.

## What you get

**The card.** A bordered card above the prompt, two lines:

| Item | Meaning |
|---|---|
| Total | Cost of the whole session so far |
| Last run | Cost of the most recent prompt |
| 5h | Share of your 5-hour usage window used, and when it resets (subscriptions only) |
| Cache | How much of the last response came from the prompt cache, or `cold` once you have been idle past the cache lifetime |
| Tokens | Tokens used this session |
| Took | How long the last prompt took |
| Context | How full the context window is. Turns red past the warning percent, with a hint to `/compact` |
| Task | A short label for what you are working on (second line) |

The most important items come first, because a narrow terminal cuts the end of the line off.

**`/ledger`.** A pane with three sections:

1. **Cost per prompt:** your last 20 prompts, newest first. Each row shows the cost, the prompt's length in characters and its task title. The title is the AI-written one when *AI task titles* is on, otherwise the first words of the prompt. The cost shows `…` until the response finishes. Slash commands are not listed.
2. **Cache health:** the cache hit rate of the last response and of the whole session, cached reads versus cache writes versus uncached input, and the minutes the cache has left. Once you have been idle past its lifetime it turns red and says the next prompt will re-bill the whole context at the write price.
3. **Tool results in context:** estimated tokens by tool, biggest first, with calls and share. Every tool result stays in context and is re-read on every later turn, so the top rows are where trimming pays most.

`/ledger reset` (or the *Reset ledger* button) clears the tool and cache figures and the prompt history.

**Idle cache nudge (off by default).** A background check shows a short notice shortly before the prompt cache expires, so a quick prompt can keep it warm. Details below.

## Settings

Open `/config` and find **info-card**. A change reloads the card immediately, except where noted.

| Setting | Default | What it does |
|---|---|---|
| Card color | green | Border and text color: green, blue, magenta, yellow, cyan, red, white, gray |
| Show total cost | on | The `Total` item |
| Show last-run cost | on | The `Last run` item |
| Show context fill | on | The `Context` item |
| Show 5-hour limit | on | The `5h` item. Hidden anyway when your account has no such limit |
| Show tokens | on | The `Tokens` item |
| Show last-run time | on | The `Took` item |
| Show current task | on | The second line with the task label |
| Show cache health | on | The `Cache` item |
| AI task titles | on | Names each task with one small Haiku call. Slash commands and prompts of four words or fewer skip the call, since a short prompt is already its own title. Off: the title is the start of your prompt |
| Context warning at % | 80 | Turns the context figure red at this percent. `0` turns the warning off |
| Cache lifetime (minutes) | 5 | How long the cache stays warm after a response. Use 60 if your plan uses the 1-hour cache. The `Cache cold` mark, the ledger countdown and the nudge all use this number, so a wrong value makes them wrong |
| Idle cache nudge | **off** | Switch on to get the background notice. Needs `/reload-plugins` or a restart to start or stop |
| Nudge lead time (seconds) | 60 | How long before the cache expires the notice appears |

## How the idle cache nudge works

- It runs a local check every 15 seconds. It sends no request to any model and costs no tokens.
- It shows one notice per response, `lead time` seconds before the cache is due to expire, and not while a response is running.
- It tells you a prompt now keeps the cache warm. Whether that is worth it is your call: a keep-alive prompt costs its own tokens.

## What it costs you

The only cost is the optional AI title: one small Haiku call per prompt of five or more words, with up to 1,500 characters of the prompt as input and about 20 tokens out, well under a tenth of a cent. Turn *AI task titles* off to remove it. Everything else is computed locally.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install info-card@efficiency-marketplace
```

## Limits

- Costs are API-equivalent estimates, not what a subscription charges.
- Tool-result sizes are estimated at about four characters per token.
- The cache figures only exist once at least one response has finished in the session.
- The ledger and prompt history live in memory for the current session; they are not saved.

MIT licensed.
