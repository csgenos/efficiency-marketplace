---
name: scope-first
description: Use before any edit that touches more than one file, a refactor, a rename, or a new feature. Finds every affected file and test first, then edits from that list.
---

# Scope first

A change that misses a caller or a test costs a whole extra round trip to fix. Finding the blast radius first is cheaper.

## Steps

1. **Scope.** Call the `scoper` agent (from the `haiku-agents` plugin) with the task in one or two sentences. It returns the affected files, why each is affected, and a Risks section, without editing anything. If `scoper` is not installed, do the same yourself: Grep for the symbol or module, include imports and exports, tests and config, and write the list down before editing.
2. **Check the list.** Treat it as a starting point, not the final answer. A cheap model can miss subtle callers. Add anything you know it missed, and read the files you are about to change.
3. **Decide.** If the Risks section shows a shared type, a public API or a migration, say so to the user in one line before editing.
4. **Edit from the list**, file by file.
5. **Close the loop.** After editing, tick off every file and test on the list. Run the related tests if the project has them, and report anything you did not check.

## Skip it when

The change is in one known file with no callers elsewhere, such as a typo, a comment, or a single constant. Scoping a trivial edit costs more than it saves.
