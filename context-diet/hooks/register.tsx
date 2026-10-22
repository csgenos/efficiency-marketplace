import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Diet } from '../types'

// Standing context is everything sent on every turn before you type: system prompt, tool and skill
// listings, agent descriptions and memory files. It is re-read each turn, so a big one costs on every message.
const PANE = 'context-diet'

const diet = atom({ plugin: 'context-diet', key: 'diet' } as const, null as Diet | null)

const kilo = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

const biggest = <T,>(items: T[], tokens: (t: T) => number, n: number) =>
  [...items].sort((a, b) => tokens(b) - tokens(a)).slice(0, n)

async function measure($: any): Promise<Diet> {
  // 'full' counts each tool and memory file with the token-count API; 'summary' estimates locally.
  const { context } = await $.session.usage({ breakdown: 'summary' })
  const b = context.breakdown
  if (!b) {
    return { window: context.window, standing: 0, categories: [], servers: [], skills: [], agents: [], memory: [] }
  }

  const servers = new Map<string, { tools: number; tokens: number }>()
  for (const t of b.mcpTools) {
    if (!t.isLoaded) {
      continue // deferred tools are only a name on the list until used
    }
    const s = servers.get(t.serverName) ?? { tools: 0, tokens: 0 }
    servers.set(t.serverName, { tools: s.tools + 1, tokens: s.tokens + t.tokens })
  }

  const categories = b.categories
    .filter((c: any) => c.kind === 'used')
    .map((c: any) => ({ name: c.name, tokens: c.tokens }))
  const messages = categories.find((c: any) => c.name === 'Messages')?.tokens ?? 0

  return {
    window: b.rawMaxTokens,
    standing: categories.reduce((n: number, c: any) => n + c.tokens, 0) - messages,
    categories: categories.filter((c: any) => c.name !== 'Messages'),
    servers: [...servers].map(([name, v]) => ({ name, ...v })),
    skills: (b.skills?.skillFrontmatter ?? []).map((s: any) => ({ name: s.name, tokens: s.tokens })),
    agents: b.agents.map((a: any) => ({ name: a.agentType, tokens: a.tokens })),
    memory: b.memoryFiles.map((m: any) => ({ name: m.path, tokens: m.tokens })),
  }
}

export const register: Register = (on, options) => {
  const topN = Math.max(1, Number(options.topN ?? 6))
  const warnPercent = Number(options.warnPercent ?? 10)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'diet',
      description: 'Context diet: what fills your context before you type, biggest first.',
    })
    return next(e)
  })

  on('command.run', { command: 'diet' }, async ($, e) => {
    await $.ui.open({ id: PANE, title: 'Context diet', focus: true, closeOnEscape: true })
    await update($, diet, () => null)
    void measure($).then(d => update($, diet, () => d))
    return { text: 'Context diet opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const d = await read($, diet)
    const { Box, Text, Button } = $.ui.resolve(e)
    const close = (
      <Button key="close" role="dismiss" onPress={() => void $.ui.close({ id: PANE })}>
        Close
      </Button>
    )
    if (!d) {
      return (
        <Box flexDirection="column">
          <Text dimColor>Measuring…</Text>
          {close}
        </Box>
      )
    }

    const percent = d.window ? (d.standing / d.window) * 100 : 0
    const isHeavy = warnPercent > 0 && percent >= warnPercent
    const list = (title: string, rows: { name: string; tokens: number; note?: string }[]) => (
      <Box flexDirection="column">
        <Text bold>{title}</Text>
        {rows.length === 0 && <Text dimColor>none</Text>}
        {biggest(rows, r => r.tokens, topN).map(r => (
          <Text key={`${title}-${r.name}`} wrap="truncate-end">{`${('~' + kilo(r.tokens)).padStart(7)}  ${r.name}${r.note ?? ''}`}</Text>
        ))}
      </Box>
    )

    return (
      <Box flexDirection="column">
        <Text bold color={isHeavy ? 'red' : undefined}>
          {`Standing context: ~${kilo(d.standing)} tokens (${percent.toFixed(1)}% of the window), re-read on every turn`}
        </Text>
        {list('By category', d.categories)}
        {list('MCP servers (loaded tools)', d.servers.map(s => ({ name: s.name, tokens: s.tokens, note: `  ${s.tools} tools` })))}
        {list('Skills', d.skills)}
        {list('Agents', d.agents)}
        {list('Memory files', d.memory)}
        <Text dimColor>
          To cut it: /plugin disable a plugin you do not use in this project, /mcp to switch off a server, or trim
          the memory file. Disabled things stop costing tokens on every turn. Numbers are estimates.
        </Text>
        <Box>
          <Button key="refresh" onPress={() => void update($, diet, () => null).then(() => measure($)).then(x => update($, diet, () => x))}>
            Re-measure
          </Button>
          {close}
        </Box>
      </Box>
    )
  })
}
