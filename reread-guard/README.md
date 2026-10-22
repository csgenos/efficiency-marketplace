# reread-guard

**Stops Claude re-reading a file that is already in context and unchanged.**

## Why it exists

Claude sometimes reads the same file twice in one session. The second read adds a second copy of the same text to the conversation, and every copy is re-read (and re-billed) on every later turn. `reread-guard` refuses the repeat, so the copy and everything it would cost afterwards never happen.

## When it blocks a read

Only when **all** of these hold:

- the same file and the same range (`offset` and `limit`) was already read in this conversation;
- the file's modified time has not changed since, so any edit by Claude or by you allows the read again;
- the file is at least 2,000 bytes, since a refusal costs a small turn and tiny files cost less than that;
- no `/compact` or `/clear` has happened since, because the old text is gone from context then.

Claude is told the file is unchanged and to use the text it already has, or to pass `offset` and `limit` to read a different part.

It never blocks images, PDFs or notebooks. Subagents each have their own memory, since each has its own context. The memory keeps the 500 most recent files, so a very long session cannot grow it without bound.

## Settings

Open `/config` and find **reread-guard**.

| Setting | Default | What it does |
|---|---|---|
| Block repeat reads | on | Off: every read goes through and nothing is refused |
| Ignore files smaller than (bytes) | 2000 | Files below this size are never blocked |

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install reread-guard@efficiency-marketplace
```

## Limits

- It only sees reads made through the `Read` tool, not a file printed by `cat` in a shell command.
- A file changed by something outside Claude Code is noticed through its modified time, not its content. A rewrite that keeps the same timestamp would be missed.
- Restarting Claude Code empties its memory.

MIT licensed.
