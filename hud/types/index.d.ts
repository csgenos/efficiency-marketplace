export type ShowKey = 'context' | 'cost' | 'lastRun' | 'tokens' | 'duration' | 'model' | 'status' | 'task'

export type Prefs = {
  style: 'band' | 'card'
  color: string
  visible: boolean
  aiTitles: boolean
  show: Record<ShowKey, boolean>
}

export type Stats = {
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  costUsd: number | null
  contextTokens: number | null
  contextWindow: number | null
  contextPercent: number | null
  model: string
  task: string
  isConnected: boolean
  lastCostUsd: number | null
  lastSeconds: number | null
}

declare module 'claude-code' {
  interface PluginState {
    hud: { prefs: Prefs; stats: Stats }
  }
}
