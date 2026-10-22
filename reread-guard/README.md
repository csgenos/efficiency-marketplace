# reread-guard

Claude sometimes reads the same file twice in one session. The second copy adds the same text to the conversation, and every copy is re-read (and re-billed) on every later turn.

`reread-guard` refuses a `Read` when **all** of these are true:

- the same file and the same range (`offset`/`limit`) was already read in this conversation,
- the file's modified time has not changed since (so any edit, by Claude or you, allows the read again),
- the file is at least 2,000 bytes (tiny files cost less than the refusal does),
- no `/compact` or `/clear` has happened since (the old text is gone then).

Images, PDFs and notebooks are never blocked. Subagents each have their own memory, since they have their own context.

## Settings

Open `/config` and find **reread-guard**: switch blocking off, or change the minimum file size.

## Install

```
/plugin install reread-guard --marketplace csgenos/efficiency-marketplace
```

## Limits

It tracks reads made through the `Read` tool. A file read through `cat` in a shell command is not seen. The refusal costs a small turn; it saves more than it costs only for files above the size limit.
