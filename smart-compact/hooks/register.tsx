import type { Register } from 'claude-code'

import { serialize, STEER_INSTRUCTIONS, SUMMARY_SYSTEM, tailStart } from './digest.ts'

// Compaction replaces old messages with a summary. Built-in compaction asks the session's own model
// (often the most expensive one) to write it, in free form. In "haiku" mode this plugin writes it with
// Haiku instead, in a fixed structure that keeps user instructions, decisions, exact identifiers and
// open errors, and keeps the most recent messages whole. Any failure falls back to the built-in path.
const HANDOFF = '.claude/handoff.md'

export const register: Register = (on, options) => {
  const mode = String(options.mode ?? 'haiku') // haiku | steer | off
  const keepRecent = Math.max(2, Number(options.keepRecentMessages ?? 8))
  const writeHandoff = options.writeHandoff !== false
  const compactAt = Number(options.compactAtPercent ?? 0)
  let compactedAtTurn = -1
  let turn = 0

  on('session.compact', async ($, e, next) => {
    if (e.agentId !== undefined || mode === 'off') {
      return next(e)
    }
    const steered = { ...e, instructions: [STEER_INSTRUCTIONS, e.instructions].filter(Boolean).join('\n\n') }
    if (mode !== 'haiku') {
      return next(steered)
    }
    if (e.trigger === 'precompute') {
      return { skip: 'smart-compact summarizes at compaction time' } // nothing is spent on a summary that may never be used
    }

    const start = tailStart(e.messages, keepRecent)
    if (start < 0) {
      return next(steered)
    }
    try {
      const focus = e.instructions ? `\n\nThe user asked the summary to focus on: ${e.instructions}` : ''
      const r = await $.model.complete({
        model: 'haiku',
        system: SUMMARY_SYSTEM,
        prompt: `Transcript to compact:\n\n${serialize(e.messages.slice(0, start))}${focus}`,
        maxTokens: 6000,
        timeoutMs: 180_000,
      })
      const summary = r.isAnswered ? r.text.trim() : ''
      if (summary.length < 300 || !summary.includes('## Goal')) {
        return next(steered) // a thin or malformed summary would lose more than it saves
      }
      if (writeHandoff) {
        const kept = `_The last ${e.messages.length - start} messages were kept word for word in the session and are not summarized here._`
        await $.fs.write(HANDOFF, `# Handoff (written by smart-compact)\n\n${summary}\n\n${kept}\n`).catch(() => undefined)
      }
      $.ui.toast(`smart-compact: summarized ${start} messages with Haiku, kept the last ${e.messages.length - start} whole.`)
      return {
        messages: [
          {
            role: 'user' as const,
            text: `This conversation was compacted. Summary of everything before the recent messages below:\n\n${summary}`,
            toolUses: [],
          },
          { role: 'assistant' as const, text: 'Understood. I will continue from this summary.', toolUses: [] },
          ...e.messages.slice(start),
        ],
      }
    } catch {
      return next(steered)
    }
  })

  // Optional early compaction: a smaller context is cheaper on every later turn.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    turn++
    if (compactAt > 0 && e.agentId === undefined && turn - compactedAtTurn > 3) {
      const { context } = await $.session.usage()
      if (context.percent !== undefined && context.percent >= compactAt) {
        compactedAtTurn = turn
        // Refused in headless (-p) sessions; there, /compact sent as a prompt still runs this plugin's summary.
        void $.session.compact().catch(() => undefined)
      }
    }
    return r
  })
}
