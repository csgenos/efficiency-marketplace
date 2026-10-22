import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Card, Ledger } from '../types'

// Settings live in the plugin's config menu (plugin.json "userConfig"); nothing to edit here.
const TASK_MAX_CHARS = 40
const TITLE_INSTRUCTIONS =
  'Name the task in this request as a 2-4 word Title Case label, e.g. "Shooting Dynamics" or "Inventory Overlay Fix". Reply with the label only.'

const card = atom(
  { plugin: 'info-card', key: 'card' } as const,
  { tokens: 0, lastCostUsd: null, lastSeconds: null, task: 'idle' } as Card,
)

const PANE = 'info-card-ledger'
const EMPTY_LEDGER: Ledger = { prompts: [], tools: {}, cache: { read: 0, created: 0, fresh: 0, lastAt: null, lastHitPercent: null } }

const ledger = atom({ plugin: 'info-card', key: 'ledger' } as const, EMPTY_LEDGER)

// Rough size of a tool result in tokens: about 4 characters each.
const estimateTokens = (chars: number) => Math.ceil(chars / 4)

const hitPercent = (read: number, created: number, fresh: number) =>
  read + created + fresh === 0 ? null : Math.round((read / (read + created + fresh)) * 100)

const MAX_PROMPTS = 20
const NUDGE_CHECK_MS = 15000

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
  const ttlMinutes = Number(options.cacheTtlMinutes ?? 5)
  const nudgeLeadMs = Number(options.nudgeLeadSeconds ?? 60) * 1000
  let costAtStartUsd: number | null = null
  let nextPromptId = 1
  let currentPromptId: number | null = null
  let isRunning = false
  let nudgeTimer: { cancel: () => void } | null = null
  let nudgedFor: number | null = null // the response time a nudge was already shown for

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ledger',
      description: 'Spend ledger: cost per prompt, tokens by tool and prompt-cache health.',
    })

    startNudge($)
    return next(e)
  })

  // Background check, off unless "Idle cache nudge" is switched on. It reads local state only and sends no request.
  // /clear ends the session without starting one, so the next prompt restarts it.
  const startNudge = ($: any) => {
    nudgeTimer?.cancel()
    nudgeTimer = null
    if (options.cacheNudge === true) {
      nudgeTimer = $.clock.every(NUDGE_CHECK_MS, async () => {
        const { cache } = await read($, ledger)
        if (isRunning || cache.lastAt === null || nudgedFor === cache.lastAt) {
          return
        }
        const leftMs = ttlMinutes * 60000 - ((await $.clock.now()) - cache.lastAt)
        if (leftMs > 0 && leftMs <= nudgeLeadMs) {
          nudgedFor = cache.lastAt
          $.ui.toast(`Prompt cache expires in about ${Math.ceil(leftMs / 1000)}s. A prompt now keeps it warm; after that the next one re-bills the whole context.`, {
            timeoutMs: 8000,
          })
        }
      })
    }
  }

  on('session.end', async ($, e, next) => {
    nudgeTimer?.cancel()
    nudgeTimer = null
    return next(e)
  })

  on('command.run', { command: 'ledger' }, async ($, e) => {
    if (e.args.trim().toLowerCase() === 'reset') {
      await update($, ledger, () => EMPTY_LEDGER)
      return { text: 'Ledger reset.' }
    }
    await $.ui.open({ id: PANE, title: 'Spend ledger', focus: true, closeOnEscape: true })
    return { text: 'Spend ledger opened.' }
  })

  // Every tool result lands in context and is re-read each turn, so its size is what the tool costs.
  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined && e.agentId === undefined) { // a subagent's tool output is not in the main context
      const chars = typeof r.text === 'string' ? r.text.length : 0
      await update($, ledger, l => {
        const t = l.tools[e.tool] ?? { calls: 0, chars: 0 }
        return { ...l, tools: { ...l.tools, [e.tool]: { calls: t.calls + 1, chars: t.chars + chars } } }
      })
    }
    return r
  })

  on('prompt.submit', async ($, e, next) => {
    // Keep the first start cost if a prompt is submitted while a run is still going.
    costAtStartUsd ??= (await $.session.usage()).cost?.usd ?? 0
    if (nudgeTimer === null) startNudge($)
    if (e.command) {
      return next(e) // slash commands are not tasks, and need no title
    }
    const fallback = e.text.replace(/\s+/g, ' ').trim().slice(0, TASK_MAX_CHARS) || 'Working'
    await update($, card, c => ({ ...c, task: fallback }))
    isRunning = true
    const promptId = nextPromptId++
    currentPromptId = promptId
    await update($, ledger, l => ({
      ...l,
      prompts: [...l.prompts, { id: promptId, title: fallback, chars: e.text.length, costUsd: null }].slice(-MAX_PROMPTS),
    }))
    // A short prompt is already its own title; skip the call.
    if (!options.aiTitles || e.text.trim().split(/\s+/).length <= 4) {
      return next(e)
    }

    // Not awaited so submitting the prompt is never delayed; one cheap haiku call names the task.
    const prompt = `${TITLE_INSTRUCTIONS}\n\n${e.text.slice(0, 1500)}`
    void $.model
      .complete({ model: 'haiku', prompt, effort: 'low', maxTokens: 20, timeoutMs: 8000 })
      .then(r => {
        if (r.isAnswered) {
          const title = r.text.trim().split('\n')[0]?.replace(/^task:\s*/i, '').slice(0, TASK_MAX_CHARS)
          if (!title) {
            return
          }
          // The history row takes the same title the card shows.
          return Promise.all([
            update($, card, c => ({ ...c, task: title })),
            update($, ledger, l => ({ ...l, prompts: l.prompts.map(x => (x.id === promptId ? { ...x, title } : x)) })),
          ])
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
    if (u && e.agentId === undefined) {
      const now = await $.clock.now()
      await update($, ledger, l => ({
        ...l,
        cache: {
          read: l.cache.read + u.cache_read_input_tokens,
          created: l.cache.created + u.cache_creation_input_tokens,
          fresh: l.cache.fresh + u.input_tokens,
          lastAt: now,
          lastHitPercent: hitPercent(u.cache_read_input_tokens, u.cache_creation_input_tokens, u.input_tokens),
        },
      }))
    }

    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const totalUsd = (await $.session.usage()).cost?.usd
      const lastCostUsd = totalUsd !== undefined && costAtStartUsd !== null ? totalUsd - costAtStartUsd : null
      costAtStartUsd = null
      isRunning = false
      const finishedId = currentPromptId
      currentPromptId = null
      if (finishedId !== null) {
        await update($, ledger, l => ({
          ...l,
          prompts: l.prompts.map(x => (x.id === finishedId ? { ...x, costUsd: lastCostUsd } : x)),
        }))
      }
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
    const lg = await read($, ledger)
    const now = await $.clock.now()
    const idleMin = lg.cache.lastAt === null ? null : (now - lg.cache.lastAt) / 60000
    const isCold = idleMin !== null && idleMin >= ttlMinutes
    const fiveHour = usage.rateLimits.find(r => r.kind === 'five_hour')

    // Most important first: on a narrow terminal the end of the line is cut off.
    const stats = [
      options.showTotal && `Total ${money(usage.cost?.usd)}`,
      options.showLastRun && `Last run ${money(c.lastCostUsd)}`,
      options.showLimit && fiveHour && `5h ${fiveHour.percentUsed}%${formatReset(fiveHour.resetsAt)}`,
      options.showCache && lg.cache.lastHitPercent !== null && `Cache ${isCold ? 'cold' : `${lg.cache.lastHitPercent}%`}`,
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

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const lg = await read($, ledger)
    const now = await $.clock.now()
    const { Box, Text, Button } = $.ui.resolve(e)
    const rows = Object.entries(lg.tools)
      .map(([tool, t]) => ({ tool, calls: t.calls, tokens: estimateTokens(t.chars) }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10)
    const total = rows.reduce((n, r) => n + r.tokens, 0)
    const c = lg.cache
    const overall = hitPercent(c.read, c.created, c.fresh)
    const idleMin = c.lastAt === null ? null : (now - c.lastAt) / 60000
    const left = idleMin === null ? null : Math.max(0, ttlMinutes - idleMin)

    return (
      <Box flexDirection="column">
        <Text bold>Cache health</Text>
        <Text>{`Last response: ${c.lastHitPercent ?? '–'}% read from cache · whole session: ${overall ?? '–'}%`}</Text>
        <Text>{`Cached reads ${formatTokens(c.read)} · cache writes ${formatTokens(c.created)} · uncached input ${formatTokens(c.fresh)}`}</Text>
        <Text color={left === 0 ? 'red' : undefined}>
          {left === null
            ? 'No response yet.'
            : left === 0
              ? `Idle ${Math.round(idleMin ?? 0)}m: the cache has probably expired, so the next prompt re-bills the whole context at the write price.`
              : `Warm for about ${left.toFixed(1)} more minutes (TTL ${ttlMinutes}m).`}
        </Text>

        <Text bold>Cost per prompt (last {MAX_PROMPTS})</Text>
        {lg.prompts.length === 0 && <Text dimColor>No prompts yet.</Text>}
        {[...lg.prompts].reverse().map(x => (
          <Text key={`prompt-${x.id}`} wrap="truncate-end">
            {`${(x.costUsd === null ? '…' : `$${x.costUsd.toFixed(2)}`).padStart(7)}  ${`${x.chars.toLocaleString('en-US')} ch`.padStart(9)}  ${x.title}`}
          </Text>
        ))}

        <Text bold>Tool results in context (estimated tokens)</Text>
        {rows.length === 0 && <Text dimColor>No tool calls yet.</Text>}
        {rows.map(r => (
          <Text key={r.tool}>{`${r.tool.padEnd(28)} ${String(r.calls).padStart(4)} calls  ~${formatTokens(r.tokens)}  ${total ? Math.round((r.tokens / total) * 100) : 0}%`}</Text>
        ))}
        <Text dimColor>Each result is re-read every turn until /clear or /compact, so big ones cost the most.</Text>

        <Box>
          <Button key="reset" onPress={() => void update($, ledger, () => EMPTY_LEDGER)}>
            Reset ledger
          </Button>
          <Button key="close" role="dismiss" onPress={() => void $.ui.close({ id: PANE })}>
            Close
          </Button>
        </Box>
      </Box>
    )
  })
}
