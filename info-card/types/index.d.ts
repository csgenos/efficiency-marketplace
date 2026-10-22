export type Card = {
  tokens: number
  lastCostUsd: number | null
  lastSeconds: number | null
  task: string
}

declare module 'claude-code' {
  interface PluginState {
    'info-card': { card: Card }
  }
}
