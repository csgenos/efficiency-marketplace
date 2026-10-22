import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { GuardStats, Seen } from '../types'
import { addSpan, compress, isCovered, isReadCommand, readSpan } from './compress.ts'

// Every tool result stays in context and is re-read on every later turn. This plugin keeps two kinds
// of waste out: a second copy of file text already in context, and the noise in long command output.
// Nothing is lost: a trimmed output's full text is saved to a file whose path is in the result.
const MAX_REMEMBERED = 500 // files remembered per session; oldest go first
const SPILL_DIR = '.claude/context-guard'
const TEXT_ONLY = /\.(png|jpe?g|gif|webp|pdf|ipynb)$/i

const stats = atom({ plugin: 'context-guard', key: 'stats' } as const, {
  readsBlocked: 0,
  charsNotReread: 0,
  outputsTrimmed: 0,
  charsTrimmed: 0,
} as GuardStats)

export const register: Register = (on, options) => {
  const blockRereads = options.blockRereads !== false
  const minBytes = Number(options.minBytes ?? 2000)
  const trimOutput = options.trimOutput !== false
  const maxChars = Number(options.maxChars ?? 6000)
  // One memory per conversation: the main one, and each subagent's own.
  const seen = new Map<string, Seen>()
  let spillCount = 0

  const forget = () => seen.clear()

  on('session.start', async ($, e, next) => {
    forget()
    await $.command.register({ name: 'guard', description: 'context-guard: what it kept out of context this session.' })
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    forget() // the earlier file text is gone from context now
    return r
  })

  on('command.run', { command: 'guard' }, async $ => {
    const s = await read($, stats)
    const k = (chars: number) => `~${Math.round(chars / 4 / 100) / 10}k tokens`
    return {
      text: [
        `Repeat reads blocked: ${s.readsBlocked} (${k(s.charsNotReread)} not added to context)`,
        `Command outputs trimmed: ${s.outputsTrimmed} (${k(s.charsTrimmed)} not added to context)`,
        `Each saving repeats on every later turn until /compact or /clear. Full outputs: ${SPILL_DIR}/`,
      ].join('\n'),
    }
  })

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const path = e.file_path
    if (!blockRereads || typeof path !== 'string' || TEXT_ONLY.test(path) || e.pages !== undefined) {
      return next(e)
    }
    let mtimeMs: number
    let size: number
    let id: string
    try {
      const st = await $.fs.stat(path)
      mtimeMs = st.mtimeMs
      size = st.size
      // One file can be named relatively or absolutely, and on Windows with either slash and any case.
      id = (st.realPath ?? path).replace(/\\/g, '/').toLowerCase()
    } catch {
      return next(e) // missing file: let the tool report it
    }

    const key = `${e.agentId ?? 'main'}|${id}`
    const span = readSpan(e.offset, e.limit)
    const before = seen.get(key)
    const isFresh = before !== undefined && before.mtimeMs === mtimeMs
    if (isFresh && size >= minBytes && isCovered(before.spans, span)) {
      await update($, stats, s => ({
        ...s,
        readsBlocked: s.readsBlocked + 1,
        charsNotReread: s.charsNotReread + Math.min(size, (span[1] - span[0] + 1) * 80),
      }))
      return {
        deny: `Already in context and unchanged since: ${path} (lines ${span[0]}-${span[1]} were read earlier). Use that text instead of reading it again. For a part not read yet, pass a different offset and limit.`,
      }
    }

    const r = await next(e)
    if (r.deny === undefined && !r.isError) {
      seen.delete(key)
      seen.set(key, { mtimeMs, spans: addSpan(isFresh ? before.spans : [], span) })
      if (seen.size > MAX_REMEMBERED) {
        seen.delete(seen.keys().next().value as string)
      }
    }
    return r
  })

  // Both shell tools: Bash, and PowerShell on Windows, return the same stdout/stderr record.
  on('tool.call', async ($, e, next) => {
    if (e.tool !== 'Bash' && e.tool !== 'PowerShell') {
      return next(e) // narrows e, and so the result's type, to the shell tools'
    }
    const r = await next(e)
    if (!trimOutput || r.deny !== undefined || isReadCommand(e.command)) {
      return r
    }
    // A failing command (non-zero exit) comes back as error text, not the tool's record, and the engine
    // refuses a rewritten error (tested), so failures always reach Claude whole.
    if (r.isError || !r.result) {
      return r
    }
    const result = r.result
    if (result.isImage || result.backgroundTaskId) {
      return r
    }
    // Very large output is already saved by Claude Code, which passes on only its first ~2KB. Trim the
    // full saved text instead, so errors near the end still reach Claude; that file is the full copy.
    const savedPath = result.persistedOutputPath
    let full = result.stdout
    if (savedPath) {
      try {
        full = await $.fs.read(savedPath)
      } catch {
        return r
      }
    }
    const stdout = compress(full, { maxChars })
    const stderr = compress(result.stderr, { maxChars })
    if (!stdout && !stderr) {
      return r
    }

    // Save the untouched output first; if that fails, return it untouched rather than lose anything.
    const spill = savedPath ?? `${SPILL_DIR}/out-${Date.now()}-${++spillCount}.log`
    if (!savedPath) {
      try {
        if (!(await $.fs.exists(`${SPILL_DIR}/.gitignore`))) {
          await $.fs.write(`${SPILL_DIR}/.gitignore`, '*\n') // keeps the folder out of git status
        }
        await $.fs.write(spill, `$ ${e.command}\n\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}\n`)
      } catch {
        return r
      }
    }

    const note = (c: { linesBefore: number; linesAfter: number }) =>
      `\n[context-guard: trimmed ${c.linesBefore} lines to ${c.linesAfter}; errors, warnings, head and tail kept. Full output: ${spill}]`
    const saved = full.length + result.stderr.length - (stdout?.text.length ?? full.length) - (stderr?.text.length ?? result.stderr.length)
    await update($, stats, s => ({ ...s, outputsTrimmed: s.outputsTrimmed + 1, charsTrimmed: s.charsTrimmed + saved }))
    // A hook's own { result } (no ref or text) makes core map the rewritten record for the model.
    return {
      context: r.context,
      result: {
        ...result,
        stdout: stdout ? stdout.text + note(stdout) : result.stdout,
        persistedOutputPath: stdout ? undefined : savedPath, // the trimmed text replaces the 2KB preview
        stderr: stderr ? stderr.text + note(stderr) : result.stderr,
      },
    }
  })
}
