import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Prefs, ShowKey, Stats } from '../types'

const PANE = 'hud-settings'
const TASK_MAX_CHARS = 48
const COLORS = ['green', 'blue', 'magenta', 'yellow', 'cyan', 'red', 'white', 'gray']
// Band text must stay readable: light text on these, dark text on the rest.
const DARK_BANDS = ['blue', 'magenta', 'red', 'gray']
const TITLE_INSTRUCTIONS =
  'Name the task in this request as a 2-4 word Title Case label, e.g. "Shooting Dynamics" or "Inventory Overlay Fix". Reply with the label only.'

const LABELS: Record<ShowKey, string> = {
  context: 'Context window',
  cost: 'Total cost (API-equiv)',
  lastRun: 'Last run cost',
  tokens: 'Tokens',
  duration: 'Last run time',
  model: 'Model',
  status: 'Connection status',
  task: 'Current task',
}

const DEFAULT_PREFS: Prefs = {
  style: 'band',
  color: 'green',
  visible: true,
  aiTitles: false,
  show: { context: true, cost: true, lastRun: true, tokens: true, duration: true, model: true, status: true, task: true },
}

const EMPTY: Stats = {
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
  lastCostUsd: null,
  lastSeconds: null,
}

const prefs = atom({ plugin: 'hud', key: 'prefs' } as const, DEFAULT_PREFS)
const stats = atom({ plugin: 'hud', key: 'stats' } as const, EMPTY)

const compact = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : String(n))
const money = (usd: number | null | undefined): string => (usd == null ? '–' : `$${usd.toFixed(2)}`)
const shortModel = (id: string): string => id.replace(/^claude-/, '') || '?'
const duration = (s: number): string => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)

const clip = (text: string): string => {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > TASK_MAX_CHARS ? `${line.slice(0, TASK_MAX_CHARS - 1)}…` : line
}

// Change a setting, keep it across sessions, and redraw.
async function setPrefs($: any, change: (p: Prefs) => Prefs) {
  const next = change(await read($, prefs))
  await $.store.set('prefs', next)
  await update($, prefs, () => next)
}

// Context, cost and model are the engine's own figures; read them after each response.
async function refresh($: any, patch: Partial<Stats>) {
  const usage = await $.session.usage()
  const model = await $.session.model()
  await update($, stats, (s: Stats) => ({
    ...s,
    ...patch,
    costUsd: usage.cost ? usage.cost.usd : null,
    contextTokens: usage.context.tokens ?? null,
    contextWindow: usage.context.window,
    contextPercent: usage.context.percent ?? null,
    model,
  }))
}

export const register: Register = on => {
  let costAtStartUsd: number | null = null

  on('session.start', async ($, e, next) => {
    const saved = (await $.store.get('prefs')) as Partial<Prefs> | undefined
    if (saved) {
      await update($, prefs, () => ({
        ...DEFAULT_PREFS,
        ...saved,
        show: { ...DEFAULT_PREFS.show, ...saved.show },
      }))
    }
    await $.command.register({
      name: 'hud',
      description: 'HUD settings pane. "/hud show" or "/hud hide" to toggle the display.',
    })
    await refresh($, {})
    return next(e)
  })

  on('command.run', { command: 'hud' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'hide') {
      await setPrefs($, p => ({ ...p, visible: false }))
      return { text: 'HUD hidden. Type /hud show to bring it back.' }
    }
    await setPrefs($, p => ({ ...p, visible: true }))
    if (arg === 'show') {
      return { text: 'HUD shown.' }
    }
    await $.ui.open({ id: PANE, title: 'HUD settings', focus: true, closeOnEscape: true })
    return { text: 'HUD settings opened.' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command) {
      return next(e)
    }
    // Keep the first start cost if a prompt is submitted while a run is still going.
    costAtStartUsd ??= (await $.session.usage()).cost?.usd ?? 0
    const fallback = clip(e.text) || 'Working'
    await update($, stats, (s: Stats) => ({ ...s, task: fallback }))

    if ((await read($, prefs)).aiTitles) {
      // Not awaited so submitting is never delayed; one cheap haiku call names the task.
      const prompt = `${TITLE_INSTRUCTIONS}\n\n${e.text.slice(0, 1500)}`
      void $.model
        .complete({ model: 'haiku', prompt, effort: 'low', maxTokens: 20, timeoutMs: 8000 })
        .then(r => {
          if (r.isAnswered) {
            const title = r.text.trim().split('\n')[0]?.replace(/^task:\s*/i, '').slice(0, TASK_MAX_CHARS)
            return update($, stats, (s: Stats) => ({ ...s, task: title || s.task }))
          }
        })
        .catch(() => undefined)
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const u = result.usage
    const current = await read($, stats)
    await refresh($, {
      inputTokens: current.inputTokens + (u ? u.input_tokens + u.cache_creation_input_tokens : 0),
      outputTokens: current.outputTokens + (u ? u.output_tokens : 0),
      cachedTokens: current.cachedTokens + (u ? u.cache_read_input_tokens : 0),
      isConnected: u !== null && u !== undefined,
    })
    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const lastCostUsd = e.cost && costAtStartUsd !== null ? e.cost.usd - costAtStartUsd : null
      costAtStartUsd = null
      await update($, stats, (s: Stats) => ({ ...s, lastCostUsd, lastSeconds: Math.round(e.durationMs / 1000) }))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const p = await read($, prefs)
    if (!p.visible) {
      return next(e)
    }
    const s = await read($, stats)
    const { Box, Text, Button } = $.ui.resolve(e)

    // Most important first: on a narrow terminal the end of the line is cut off.
    const items = [
      p.show.context &&
        (s.contextPercent === null
          ? 'ctx -'
          : `ctx ${s.contextPercent}% (${compact(s.contextTokens ?? 0)}/${compact(s.contextWindow ?? 0)})`),
      p.show.cost && `~${money(s.costUsd)} API-equiv`,
      p.show.lastRun && `last ${money(s.lastCostUsd)}`,
      p.show.tokens && `tok in ${compact(s.inputTokens)} out ${compact(s.outputTokens)} cache ${compact(s.cachedTokens)}`,
      p.show.duration && s.lastSeconds !== null && `took ${duration(s.lastSeconds)}`,
      p.show.model && shortModel(s.model),
      p.show.status && (s.isConnected ? 'online' : 'no usage data'),
    ].filter(Boolean) as string[]
    const task = p.show.task ? `task: ${s.task}` : ''

    const hide = () => {
      void setPrefs($, x => ({ ...x, visible: false }))
      $.ui.toast('HUD hidden. Type /hud to bring it back.')
    }
    const close = (
      <Button key="hud-close" plain dimColor onPress={hide}>
        {' ✕'}
      </Button>
    )

    if (p.style === 'card') {
      return (
        <Box borderStyle="round" borderColor={p.color} paddingX={1} flexDirection="column">
          <Box>
            <Text color={p.color} bold wrap="truncate-end">
              {items.join(' · ')}
            </Text>
            {close}
          </Box>
          {task && (
            <Text color={p.color} wrap="truncate-end">
              {task}
            </Text>
          )}
        </Box>
      )
    }

    const textColor = DARK_BANDS.includes(p.color) ? 'white' : 'black'
    const line = [...items, task].filter(Boolean).join(' │ ')
    return (
      <Box>
        <Text color={textColor} backgroundColor={p.color} wrap="truncate-end">
          {` ${line} `}
        </Text>
        {close}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const p = await read($, prefs)
    const { Box, Text, Button } = $.ui.resolve(e)
    const mark = (isOn: boolean) => (isOn ? '[x]' : '[ ]')

    return (
      <Box flexDirection="column">
        <Text bold>Look</Text>
        <Box>
          <Button key="style-band" onPress={() => void setPrefs($, x => ({ ...x, style: 'band' }))}>
            {`${p.style === 'band' ? '(•)' : '( )'} Band`}
          </Button>
          <Button key="style-card" onPress={() => void setPrefs($, x => ({ ...x, style: 'card' }))}>
            {`${p.style === 'card' ? '(•)' : '( )'} Card`}
          </Button>
        </Box>

        <Text bold>Color</Text>
        <Box flexWrap="wrap">
          {COLORS.map(c => (
            <Button key={`color-${c}`} onPress={() => void setPrefs($, x => ({ ...x, color: c }))}>
              {`${p.color === c ? '(•)' : '( )'} ${c}`}
            </Button>
          ))}
        </Box>

        <Text bold>Show</Text>
        {(Object.keys(LABELS) as ShowKey[]).map(k => (
          <Button
            key={`show-${k}`}
            onPress={() => void setPrefs($, x => ({ ...x, show: { ...x.show, [k]: !x.show[k] } }))}
          >
            {`${mark(p.show[k])} ${LABELS[k]}`}
          </Button>
        ))}

        <Text bold>Extras</Text>
        <Button key="ai-titles" onPress={() => void setPrefs($, x => ({ ...x, aiTitles: !x.aiTitles }))}>
          {`${mark(p.aiTitles)} Name tasks with a small AI call (uses a little extra usage)`}
        </Button>

        <Text bold>Display</Text>
        <Box>
          <Button key="toggle-visible" variant="primary" onPress={() => void setPrefs($, x => ({ ...x, visible: !x.visible }))}>
            {p.visible ? 'Hide HUD' : 'Show HUD'}
          </Button>
          <Button key="close-pane" role="dismiss" onPress={() => void $.ui.close({ id: PANE })}>
            Close settings
          </Button>
        </Box>
        <Text dimColor>Hidden? Type /hud to bring it back.</Text>
      </Box>
    )
  })
}
