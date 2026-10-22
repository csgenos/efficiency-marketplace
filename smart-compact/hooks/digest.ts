// Pure transcript logic for smart-compact: no engine calls, so it is unit-tested on its own (tests/digest.test.ts).

export type Msg = {
  role: 'user' | 'assistant'
  text: string
  toolUses: readonly { tool: string; input: Record<string, unknown>; text?: string; isError?: true }[]
  toolResults?: readonly unknown[]
}

// The handoff structure: what a fresh reader needs to carry on, nothing that the repo already records.
export const SUMMARY_SYSTEM = `You compact a coding session between a user and an AI assistant into a summary the assistant will continue from. The original messages will be deleted, so anything you leave out is lost.

Write these sections, in this order, as Markdown:
## Goal
What the user is trying to achieve overall, in their terms.
## User instructions and preferences
Every explicit instruction, correction, constraint or preference the user stated, close to their words. These outrank everything else; never drop one.
## Decisions
Choices made and why, so they are not re-litigated.
## Done
What is finished and verified, and how it was verified.
## Files and identifiers
Exact paths, function and variable names, commands, URLs, IDs and versions that matter, one line each with what changed or why it matters.
## Open problems
Errors not yet fixed, with the exact error text; failing tests; things not yet checked.
## State
Anything running, changed temporarily, or half-done (servers, flags to restore, uncommitted work).
## Next step
The single most useful next action.

Rules: be specific and exact, never vague. Quote error messages and identifiers exactly. Do not include code blocks longer than 5 lines. Do not invent anything not in the transcript. Write "none" for an empty section.`

export const STEER_INSTRUCTIONS = `Structure the summary with these sections: Goal; User instructions and preferences (every explicit instruction or correction, close to the user's words); Decisions (with reasons); Done (and how verified); Files and identifiers (exact paths, names, commands, IDs); Open problems (exact error text); State (running processes, temporary changes to restore); Next step. Be exact; never drop a user instruction.`

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)} …[${s.length - n} more chars]` : s)

// Renders messages as plain text for the summarizer; tool output is clipped, since it is the bulk and the least needed.
export function serialize(messages: readonly Msg[], toolChars = 1200, maxChars = 600_000): string {
  const render = (limit: number) =>
    messages
      .map(m => {
        const lines = [`### ${m.role === 'user' ? 'User' : 'Assistant'}`]
        if (m.text.trim()) lines.push(m.text.trim())
        for (const t of m.toolUses) {
          lines.push(`→ ${t.tool} ${clip(JSON.stringify(t.input), 300)}`)
          if (t.text) lines.push(`${t.isError ? '✗ ' : '← '}${clip(t.text, limit)}`)
        }
        return lines.length > 1 ? lines.join('\n') : ''
      })
      .filter(Boolean)
      .join('\n\n')

  let out = render(toolChars)
  if (out.length > maxChars) out = render(200)
  if (out.length > maxChars) {
    // Still too big: keep the start (the goal) and the most recent part.
    const head = Math.floor(maxChars * 0.2)
    out = `${out.slice(0, head)}\n\n…[middle of the session omitted]…\n\n${out.slice(out.length - (maxChars - head))}`
  }
  return out
}

// Index where the kept tail starts: a user message that is a real prompt, not tool results, so no
// tool call is split from its result. Prefers keeping at least keepRecent messages; in a short session
// it keeps fewer (from the latest prompt). Returns -1 when no such point leaves enough to summarize.
export function tailStart(messages: readonly Msg[], keepRecent: number, minSummarized = 4): number {
  const isPrompt = (m: Msg) => m.role === 'user' && !(m.toolResults && m.toolResults.length) && m.text.trim() !== ''
  let latest = -1
  for (let i = messages.length - 1; i >= minSummarized; i--) {
    if (!isPrompt(messages[i]!)) continue
    if (latest < 0) latest = i
    if (i <= messages.length - keepRecent) return i
  }
  return latest
}
