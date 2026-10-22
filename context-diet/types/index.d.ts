export type Row = { name: string; tokens: number }

export type Diet = {
  window: number
  standing: number
  categories: Row[]
  servers: { name: string; tools: number; tokens: number }[]
  skills: Row[]
  agents: Row[]
  memory: Row[]
}

declare module 'claude-code' {
  interface PluginState {
    'context-diet': { diet: Diet | null }
  }
}
