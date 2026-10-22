# session-hud
A green band above the prompt showing session tokens, the cost at API prices, context window use, the current task, connection status and the active model. It needs no setup: install it and it appears in every session.

## Customizing

Open `hooks/register.tsx` and edit the **Easy settings** block at the top: change the color (green, blue, magenta, yellow, cyan, red, white, gray) and switch parts on or off. On a narrow terminal the end of the line is cut off, so the most important items come first. Restart Claude Code after editing.
