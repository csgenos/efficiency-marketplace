# context-guard

**Keeps waste out of your context window without losing anything: no duplicate file text, no walls of build noise.**

## Why it exists

Everything a tool returns stays in the conversation and is re-read on every later turn. Two kinds of result are pure waste: a second copy of file text that is already there, and hundreds of lines of routine command output around the one line that matters. `context-guard` stops both at the tool boundary, before they enter context, and keeps the full text on disk so nothing is ever lost.

It replaces the older `reread-guard`, which only blocked exact repeat reads.

## What it does

### 1. Blocks re-reads by line range

Every `Read` is recorded as a line range per file. A later `Read` is refused when its whole range was already read **and** the file has not changed since (modified time). So:

- reading lines 100-149, then 120-129, refuses the second read;
- reading lines 1-100, then 101-200, then 50-150, refuses the third (ranges are merged);
- any edit, by Claude or by you, allows a fresh read;
- `/compact` and `/clear` reset the record, since the old text is gone from context;
- relative and absolute paths, and either slash on Windows, count as the same file;
- each subagent has its own record, since each has its own context.

Claude is told the lines are already in context and to use them, or to pass a different `offset` and `limit`. Files under the size limit, images, PDFs and notebooks are never blocked.

### 2. Trims long command output, losslessly

For **Bash** and **PowerShell** results longer than the limit (6,000 characters by default):

1. strips colour codes and progress-bar redraws (`\r` frames);
2. collapses runs of lines that differ only in numbers (`compiled module_1 … module_4000`) to first, count, last;
3. if still long, keeps the first 30 lines, the last 60, and every line that looks like a problem (`error`, `fail`, `warning`, `exception`, `traceback`, `assert`, stack frames, `✗`…) with 2 lines of context around each;
4. appends a note with the line counts and the path of the **full output**, which Claude can read if it needs more.

Claude Code itself saves very large outputs to a file and passes on only their first ~2KB, which can cut off an error at the end. For those, `context-guard` trims the **full saved text** instead, so a warning on line 2,700 of 4,000 still reaches Claude.

Never trimmed: read commands whose whole output is the point (`cat`, `head`, `tail`, `sed`, `git diff`, `git show`, `Get-Content`…), image output, background commands, and **failing commands** (a non-zero exit comes back as error text, which Claude Code does not let a plugin rewrite; failures always arrive whole).

### 3. `/guard`

Shows what was kept out this session: repeat reads blocked and outputs trimmed, each with an estimate of the tokens not added to context.

## Settings

Open `/config` and find **context-guard**.

| Setting | Default | What it does |
|---|---|---|
| Block repeat reads | on | Off: every read goes through |
| Ignore files smaller than (bytes) | 2000 | Smaller files are never blocked; a refusal costs more than re-reading them |
| Trim long command output | on | Off: command output is never touched |
| Trim output longer than (characters) | 6000 | Output at or under this size is never touched |

Full outputs that Claude Code did not already save go to `.claude/context-guard/` in the project. That folder contains its own `.gitignore`, so it never shows up in `git status`.

## Measured

See the [benchmark](../bench/README.md). On `lint-fix` (an 82KB linter output with three problems spread through it) context fell from 143k to 105k tokens (-27%) and cost by 17%, with every run passing. In another test, a 47KB PowerShell output (602 lines) reached Claude as 5 lines with its warning intact. Strong models already filter output themselves (`| head`, `| grep`), so the benefit shows on tasks where they do not.

## Install

```
/plugin marketplace add csgenos/efficiency-marketplace
/plugin install context-guard@efficiency-marketplace
```

## Limits

- Trimming is pattern-based. An important line that matches none of the problem patterns, in the middle of a long output, is dropped from what Claude sees (it is still in the saved file).
- It only sees reads made through the `Read` tool, not `cat` in a shell.
- A file changed outside Claude Code without a new modified time would be missed.
- Restarting Claude Code empties the read record.

Unit tests: `node --test context-guard/tests/*.test.ts` (Node 22.6 or later).

MIT licensed.
