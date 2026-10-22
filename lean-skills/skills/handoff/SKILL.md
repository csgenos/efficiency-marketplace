---
name: handoff
description: Use when a long session should be reset, context is getting full, or the user says handoff or wrap up. Writes a short state summary to a file so a fresh session can continue without the old history.
---

# Handoff

A long conversation is re-read on every turn. A fresh session that starts from a short summary is cheaper and often clearer.

## Steps

1. **Write the summary** to `.claude/handoff.md` in the project (create the folder if needed). Keep it under about 300 words, in these sections:
   - **Goal:** what the user is trying to achieve, in one or two sentences.
   - **Done:** what is finished and verified.
   - **Decisions:** choices made and why, so they are not re-litigated.
   - **Files:** paths touched or central to the work, one line each on what changed.
   - **State:** anything half-finished, running, or not yet tested (servers running, flags changed that must be restored, failing tests).
   - **Next step:** the single most useful thing to do first.
2. **Record only what is not recoverable.** Leave out anything visible in the code, git history or project docs. Do not paste code or long output.
3. **Check it reads cold.** A person with no memory of this session should be able to continue from it. Do not include secrets or credentials.
4. **Tell the user** the path, then say: run `/clear`, and start the next session with "read .claude/handoff.md and continue". You cannot clear the session yourself.
5. **Suggest ignoring it.** If `.claude/handoff.md` is not in `.gitignore`, mention that it will otherwise show up as an untracked file.

## When to suggest it

When the context warning shows, when the work is switching to an unrelated task, or after a long debugging detour. Offer it in one line; do not run it unasked unless the user said handoff.
