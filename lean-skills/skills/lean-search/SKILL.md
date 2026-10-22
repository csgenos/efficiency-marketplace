---
name: lean-search
description: Use when exploring or searching a codebase to find files, symbols or usages, before reading anything. Keeps searches cheap by searching before reading and delegating broad sweeps.
---

# Lean search

Everything you read stays in context and is re-read on every later turn, so read the least that answers the question.

## Order of attack

1. **Narrow first.** Use Glob for names and Grep for contents before opening any file. Prefer `files_with_matches` or counts, then narrow to the few hits that matter.
2. **Delegate broad sweeps.** If answering needs more than two or three files, or "where is X / what uses X" across a codebase, call the `finder` agent (from the `haiku-agents` plugin) instead of searching yourself. It does the reading on a cheaper model and returns paths with line numbers. If `finder` is not installed, use the `Explore` agent, or search yourself with the steps here.
3. **Read ranges, not files.** Once Grep gives a line number, Read with `offset` and `limit` around it. Read a whole file only when you must edit most of it or understand all of it.
4. **Never read twice.** If a file is already in this conversation and has not been edited since, use the text you have. Do not re-read it, and do not `cat` it in a shell command either.
5. **Trim command output.** Pipe long shell output through `head`, `tail` or `grep`. For logs and test runs, show failures and the last lines, not everything.
6. **Large files and logs.** For a file too big to read whole, use the `headroom` skill if it is installed (it outlines the file first); otherwise Grep for line numbers and read ranges.
7. **Stop when answered.** Once you have the file and line you need, stop exploring.

## Do not trade away correctness

Lean does not mean guessing. If a search is ambiguous, read the extra file. If the question needs the whole file, read the whole file. The goal is to avoid reading things that do not change the answer.
