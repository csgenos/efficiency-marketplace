import type { Register } from 'claude-code'

import type { Seen } from '../types'

// Reading a file again adds a second copy to context, and every copy is re-read on every later turn.
// A repeat is refused only when the same range of the same file is still in context and the file's
// modified time has not moved. Compaction and /clear empty the memory, because the text is gone then.
const MAX_REMEMBERED = 500 // oldest entries go first, so a very long session cannot grow the map without bound
const TEXT_ONLY = /\.(png|jpe?g|gif|webp|pdf|ipynb)$/i

export const register: Register = (on, options) => {
  const isOn = options.enabled !== false
  const minBytes = Number(options.minChars ?? 2000)
  // One memory per conversation: the main one, and each subagent's own.
  const seen = new Map<string, Seen>()

  on('session.start', async ($, e, next) => {
    seen.clear()
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    seen.clear()
    return r
  })

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const path = e.file_path
    if (typeof path !== 'string' || TEXT_ONLY.test(path) || 'pages' in e) {
      return next(e)
    }
    const key = `${e.agentId ?? 'main'}|${path}`
    const offset = Number(e.offset ?? 0)
    const limit = Number(e.limit ?? 0)

    let mtimeMs: number | null = null
    let size = 0
    try {
      const stat = await $.fs.stat(path)
      mtimeMs = stat.mtimeMs
      size = stat.size
    } catch {
      return next(e) // missing file: let the tool report it
    }

    const before = seen.get(key)
    if (isOn && before && size >= minBytes && before.mtimeMs === mtimeMs && before.offset === offset && before.limit === limit) {
      return {
        deny: `Already read and unchanged since: ${path}${offset || limit ? ` (same range)` : ''}. Its text is earlier in this conversation; use that instead of reading it again. If you need a different part, pass offset and limit.`,
      }
    }

    const r = await next(e)
    if (r.deny === undefined && !r.isError) {
      seen.delete(key)
      seen.set(key, { mtimeMs, offset, limit })
      if (seen.size > MAX_REMEMBERED) {
        seen.delete(seen.keys().next().value as string)
      }
    }
    return r
  })
}
