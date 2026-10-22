import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Hud } from '../types'

// ---- Easy settings: edit these ----
// Color presets: green, blue, magenta, yellow, cyan, red, white, gray (or any terminal color name).
const BAND_COLOR = 'green'
// Use 'black' on bright bands, 'white' on dark ones (blue, magenta, red, gray).
const TEXT_COLOR = 'black'
// Turn parts of the band off by setting them to false.
const SHOW = { tokens: true, cost: true, context: true, task: true, status: true, model: true }
// ---- End settings ----
const TASK_MAX_CHARS = 48

const EMPTY: Hud = {
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
  costUsd: null,
  contextTokens: null,
  contextWindow: null,
  contextPercent: null,
  model: '',
  task: 'no task yet',
  isConnected: true,
}

const hud = atom({ plugin: 'session-hud', key: 'hud' } as const, EMPTY)

const compact = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : String(n))

const shortModel = (id: string): string => id.replace(/^claude-/, '') || '?'

const clip = (text: string): string => {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > TASK_MAX_CHARS ? `${line.slice(0, TASK_MAX_CHARS - 1)}…` : line
}

// Context, cost and model are the engine's own figures; read them after each response.
async function refresh($: any, patch: Partial<Hud>) {
  const usage = await $.session.usage()
  const model = await $.session.model()
  await update($, hud, (h: Hud) => ({
    ...h,
    ...patch,
    costUsd: usage.cost ? usage.cost.usd : null,
    contextTokens: usage.context.tokens ?? null,
    contextWindow: usage.context.window,
    contextPercent: usage.context.percent ?? null,
    model,
  }))
}

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    if (!e.command) {
      await update($, hud, (h: Hud) => ({ ...h, task: clip(e.text) }))
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const u = result.usage
    const current = await read($, hud)
    await refresh($, {
      inputTokens: current.inputTokens + (u ? u.input_tokens + u.cache_creation_input_tokens : 0),
      outputTokens: current.outputTokens + (u ? u.output_tokens : 0),
      cachedTokens: current.cachedTokens + (u ? u.cache_read_input_tokens : 0),
      isConnected: u !== null,
    })
    return result
  })

  on('session.start', async ($, e, next) => {
    await refresh($, {})
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const h = await read($, hud)
    const { Box, Text } = $.ui.resolve(e)

    const context =
      h.contextPercent === null ? 'ctx -' : `ctx ${h.contextPercent}% (${compact(h.contextTokens ?? 0)}/${compact(h.contextWindow ?? 0)})`
    const cost = h.costUsd === null ? '$-' : `$${h.costUsd.toFixed(2)}`
    const tokens = `tok in ${compact(h.inputTokens)} out ${compact(h.outputTokens)} cache ${compact(h.cachedTokens)}`
    // Most important first: on a narrow terminal the end of the line is cut off.
    const parts = [
      SHOW.context && context,
      SHOW.cost && `~${cost} API-equiv`,
      SHOW.tokens && tokens,
      SHOW.model && shortModel(h.model),
      SHOW.status && (h.isConnected ? 'online' : 'no usage data'),
      SHOW.task && `task: ${h.task}`,
    ].filter(Boolean)
    const line = parts.join(' │ ')

    return (
      <Box>
        <Text color={TEXT_COLOR} backgroundColor={BAND_COLOR} wrap="truncate-end">
          {` ${line} `}
        </Text>
      </Box>
    )
  })
}
