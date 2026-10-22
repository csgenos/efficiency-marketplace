# reread-guard

**Stops Claude re-reading a file that is already in context and unchanged.**

Refuses a `Read` when the same file and range was already read in this conversation, the file's modified time is unchanged, and the file is at least 2,000 bytes. Images, PDFs and notebooks are never blocked.

## How it saves tokens

A second read adds a second copy of the same text, and every copy is re-read (and re-billed) on every later turn. Refusing the repeat saves the copy and everything it would cost afterwards. Any edit, by Claude or by you, changes the modified time and allows the read again. `/compact` and `/clear` reset the memory, because the old text is gone then. Subagents each have their own memory.

## Using it

Nothing to do: Claude is told the file is unchanged and to use the text it already has, or to pass `offset` and `limit` for another part.

## Settings

`/config` → **reread-guard**: switch blocking off (reads then go through) and set the minimum file size.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install reread-guard@efficiency-marketplace
```

## Limits

It sees reads made through the `Read` tool, not a file printed by `cat` in a shell command. A refusal costs a small turn, which is why small files are exempt.

MIT licensed.
