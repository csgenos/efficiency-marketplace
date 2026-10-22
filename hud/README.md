# hud

A small display above the Claude Code prompt showing context window use, session cost at API prices, last-run cost and time, tokens, model, connection status and the current task. It comes as a one-line **band** or a bordered **card**.

## Using it

- It appears in every session after install, with no setup.
- Type `/hud` to open the settings pane: pick band or card, pick a color, and switch each item on or off. Settings are saved across sessions.
- Click the small `✕` at the end of the display to hide it. Type `/hud` (or `/hud show`) to bring it back. `/hud hide` hides it from the keyboard.
- Costs are API-equivalent estimates, not what a subscription charges.
- On a narrow terminal the end of the line is cut off, so the most important items come first.
- Optional: turn on "Name tasks with a small AI call" in settings to get short task titles; it uses a little extra usage per prompt, so it is off by default.

MIT licensed.
