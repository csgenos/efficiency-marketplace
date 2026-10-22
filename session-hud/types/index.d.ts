export type Hud = {
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
}

declare module 'claude-code' {
  interface PluginState {
    'session-hud': { hud: Hud }
  }
}
