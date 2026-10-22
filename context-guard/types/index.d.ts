export type Seen = { mtimeMs: number; spans: [number, number][] }

export type GuardStats = { readsBlocked: number; charsNotReread: number; outputsTrimmed: number; charsTrimmed: number }

declare module 'claude-code' {
  interface PluginState {
    'context-guard': { stats: GuardStats }
  }
}
