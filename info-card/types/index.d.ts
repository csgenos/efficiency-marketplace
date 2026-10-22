export type Card = {
  tokens: number
  lastCostUsd: number | null
  lastSeconds: number | null
  task: string
}

export type Ledger = {
  tools: Record<string, { calls: number; chars: number }>
  cache: { read: number; created: number; fresh: number; lastAt: number | null; lastHitPercent: number | null }
}

declare module 'claude-code' {
  interface PluginState {
    'info-card': { card: Card; ledger: Ledger }
  }
}
