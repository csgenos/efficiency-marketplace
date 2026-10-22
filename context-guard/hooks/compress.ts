// Pure text logic for context-guard: no engine calls, so it is unit-tested on its own (tests/compress.test.ts).

export type CompressOptions = {
  maxChars: number // output at or under this size is left alone
  head: number // lines always kept from the start
  tail: number // lines always kept from the end
  context: number // lines kept around each important line
  maxImportant: number // cap on important lines kept, so a wall of warnings cannot defeat the trim
}

export type Compressed = { text: string; linesBefore: number; linesAfter: number }

export const DEFAULTS: CompressOptions = { maxChars: 6000, head: 30, tail: 60, context: 2, maxImportant: 120 }

const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07/g
const IMPORTANT =
  /\b(error|errors|err!|fail|failed|failure|failing|exception|traceback|panic|fatal|warning|assert|assertion|denied|cannot|unable|undefined|segmentation|not found|expected|received)\b|✗|✘|×|FAIL|ERR!|^\s*at\s|^\s*File "/i

// Commands whose whole output is the point; trimming them would hide what was asked for.
const READ_COMMANDS = /^\s*(cat|type|head|tail|sed|awk|less|more|bat|jq|get-content|gc|git\s+(diff|show|log\s+-p|blame)|diff|xxd|od)\b/i

export function isReadCommand(command: string): boolean {
  return command.split(/&&|\|\||;/).some(part => READ_COMMANDS.test(part.split('|')[0] ?? ''))
}

// Strips colour codes and keeps only the last frame of carriage-return progress lines.
export function clean(text: string): string[] {
  return text
    .replace(ANSI, '')
    .split('\n')
    .map(line => {
      const frames = line.replace(/\r$/, '').split('\r')
      return frames[frames.length - 1] ?? ''
    })
}

// Lines that differ only in numbers (counters, timings, byte sizes) are "similar".
const shape = (line: string) => line.replace(/\d+(\.\d+)?/g, '#').trim()

export function collapseRuns(lines: string[]): string[] {
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    let j = i + 1
    while (j < lines.length && shape(lines[j]!) === shape(lines[i]!)) {
      j++
    }
    const run = j - i
    if (run >= 4) {
      out.push(lines[i]!, `… ${run - 2} similar lines`, lines[j - 1]!)
    } else {
      out.push(...lines.slice(i, j))
    }
    i = j
  }
  return out
}

export function compress(raw: string, options: Partial<CompressOptions> = {}): Compressed | null {
  const o = { ...DEFAULTS, ...options }
  const linesBefore = raw.split('\n').length
  if (raw.length <= o.maxChars) {
    return null
  }

  let lines = collapseRuns(clean(raw))
  if (lines.join('\n').length > o.maxChars) {
    const keep = new Set<number>()
    for (let i = 0; i < Math.min(o.head, lines.length); i++) keep.add(i)
    for (let i = Math.max(0, lines.length - o.tail); i < lines.length; i++) keep.add(i)
    let important = 0
    for (let i = 0; i < lines.length && important < o.maxImportant; i++) {
      if (IMPORTANT.test(lines[i]!)) {
        important++
        for (let k = Math.max(0, i - o.context); k <= Math.min(lines.length - 1, i + o.context); k++) keep.add(k)
      }
    }
    const out: string[] = []
    let skipped = 0
    lines.forEach((line, i) => {
      if (keep.has(i)) {
        if (skipped) out.push(`… ${skipped} lines omitted`)
        skipped = 0
        out.push(line)
      } else {
        skipped++
      }
    })
    if (skipped) out.push(`… ${skipped} lines omitted`)
    lines = out
  }

  const text = lines.join('\n')
  // Not worth a rewrite (and the footer) unless it saves a real amount.
  if (raw.length - text.length < Math.max(1000, raw.length * 0.2)) {
    return null
  }
  return { text, linesBefore, linesAfter: lines.length }
}

// Read ranges are 1-based inclusive line spans; a read with no limit covers the tool's default window.
export type Span = [number, number]
export const READ_DEFAULT_LINES = 2000

export function readSpan(offset: unknown, limit: unknown): Span {
  const start = Math.max(1, Number(offset) || 1)
  const count = Number(limit) > 0 ? Number(limit) : READ_DEFAULT_LINES
  return [start, start + count - 1]
}

// Merges a new span into a sorted, non-overlapping list.
export function addSpan(spans: Span[], span: Span): Span[] {
  const all = [...spans, span].sort((a, b) => a[0] - b[0])
  const out: Span[] = []
  for (const s of all) {
    const last = out[out.length - 1]
    if (last && s[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], s[1])
    } else {
      out.push([s[0], s[1]])
    }
  }
  return out
}

export function isCovered(spans: Span[], span: Span): boolean {
  return spans.some(s => s[0] <= span[0] && s[1] >= span[1])
}
