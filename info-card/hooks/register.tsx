import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Card } from '../types'

// Settings live in the plugin's config menu (plugin.json "userConfig"); nothing to edit here.
const TASK_MAX_CHARS = 40
const TITLE_INSTRUCTIONS =
  'Name the task in this request as a 2-4 word Title Case label, e.g. "Shooting Dynamics" or "Inventory Overlay Fix". Reply with the label only.'

const card = atom(
  { plugin: 'info-card', key: 'card' } as const,
  { tokens: 0, lastCostUsd: null, lastSeconds: null, task: 'idle' } as Card,
)

const formatTokens = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`

const formatDuration = (seconds: number) =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`

const formatReset = (iso?: string) => {
  if (!iso) {
    return ''
  }
  const minutes = Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 60000))
  return ` (resets ${minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`})`
}

export const register: Register = (on, options) => {
  const color = String(options.color ?? 'green')
  const warnAt = Number(options.warnContextPercent ?? 80)
  let costAtStartUsd: number | null = null

  on('prompt.submit', async ($, e, next) => {
    // Keep the first start cost if a prompt is submitted while a run is still going.
    costAtStartUsd ??= (await $.session.usage()).cost?.usd ?? 0
    const fallback = e.text.replace(/\s+/g, ' ').trim().slice(0, TASK_MAX_CHARS) || 'Working'
    await update($, card, c => ({ ...c, task: fallback }))
    if (!options.aiTitles) {
      return next(e)
    }

    // Not awaited so submitting the prompt is never delayed; one cheap haiku call names the task.
    const prompt = `${TITLE_INSTRUCTIONS}\n\n${e.text.slice(0, 1500)}`
    void $.model
      .complete({ model: 'haiku', prompt, effort: 'low', maxTokens: 20, timeoutMs: 8000 })
      .then(r => {
        if (r.isAnswered) {
          const title = r.text.trim().split('\n')[0]?.replace(/^task:\s*/i, '').slice(0, TASK_MAX_CHARS)
          return update($, card, c => ({ ...c, task: title || c.task }))
        }
      })
      .catch(() => undefined)

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const u = result.usage
    const stepTokens = u
      ? u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      : 0
    await update($, card, c => ({ ...c, tokens: c.tokens + stepTokens }))

    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const lastCostUsd = e.cost && costAtStartUsd !== null ? e.cost.usd - costAtStartUsd : null
      costAtStartUsd = null
      await update($, card, c => ({
        ...c,
        lastCostUsd,
        lastSeconds: Math.round(e.durationMs / 1000),
        task: 'idle',
      }))
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const c = await read($, card)
    const usage = await $.session.usage()
    const money = (usd: number | null | undefined) => (usd == null ? '–' : `$${usd.toFixed(2)}`)
    const { Box, Text } = $.ui.resolve(e)
    const percent = usage.context.percent
    const isContextHot = warnAt > 0 && percent !== undefined && percent >= warnAt
    const fiveHour = usage.rateLimits.find(r => r.kind === 'five_hour')

    // Most important first: on a narrow terminal the end of the line is cut off.
    const stats = [
      options.showTotal && `Total ${money(usage.cost?.usd)}`,
      options.showLastRun && `Last run ${money(c.lastCostUsd)}`,
      options.showLimit && fiveHour && `5h ${fiveHour.percentUsed}%${formatReset(fiveHour.resetsAt)}`,
      options.showTokens && `Tokens ${formatTokens(c.tokens)}`,
      options.showDuration && `Took ${c.lastSeconds == null ? '–' : formatDuration(c.lastSeconds)}`,
    ]
      .filter(Boolean)
      .join(' · ')

    return (
      <Box borderStyle="round" borderColor={color} paddingX={1} flexDirection="column">
        <Text color={color} bold wrap="truncate-end">
          {stats}
          {options.showContext && percent !== undefined && (
            <Text color={isContextHot ? 'red' : color} bold>
              {stats ? ' · ' : ''}Context {percent}%{isContextHot ? ' – consider /compact' : ''}
            </Text>
          )}
        </Text>
        {options.showTask && (
          <Text color={color} wrap="truncate-end">
            Task: {c.task}
          </Text>
        )}
      </Box>
    )
  })
}
