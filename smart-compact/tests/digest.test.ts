// Run: node --test smart-compact/tests/digest.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { type Msg, serialize, tailStart } from '../hooks/digest.ts'

const user = (text: string): Msg => ({ role: 'user', text, toolUses: [] })
const results = (): Msg => ({ role: 'user', text: '', toolUses: [], toolResults: [{}] })
const asst = (text: string, tool?: string): Msg => ({
  role: 'assistant',
  text,
  toolUses: tool ? [{ tool, input: { command: 'npm test' }, text: 'x'.repeat(5000) }] : [],
})

test('tail starts at a real prompt, never between a tool call and its result', () => {
  const m = [user('a'), asst('b'), user('c'), asst('d', 'Bash'), results(), asst('e'), user('f'), asst('g', 'Bash'), results(), asst('h')]
  const i = tailStart(m, 4)
  assert.equal(i, 6)
  assert.equal(m[i]!.text, 'f')
})

test('a short session keeps fewer messages rather than giving up', () => {
  const m = [user('a'), asst('b', 'Bash'), results(), asst('c', 'Bash'), results(), asst('d'), user('e'), asst('f', 'Bash'), results(), asst('g')]
  assert.equal(tailStart(m, 8), 6)
})

test('no safe tail point means no custom compaction', () => {
  const m = [user('a'), asst('b', 'Bash'), results(), asst('c', 'Bash'), results(), asst('d')]
  assert.equal(tailStart(m, 3), -1)
})

test('tool output is clipped, prompts are kept whole', () => {
  const s = serialize([user('please fix the login bug in auth.ts'), asst('running tests', 'Bash')])
  assert.ok(s.includes('please fix the login bug in auth.ts'))
  assert.ok(s.includes('→ Bash {"command":"npm test"}'))
  assert.ok(s.includes('more chars]'))
  assert.ok(s.length < 2000)
})

test('an oversized transcript keeps its start and its end', () => {
  const m = Array.from({ length: 400 }, (_, i) => (i % 2 ? asst(`answer ${i}`, 'Bash') : user(`prompt ${i}`)))
  const s = serialize(m, 1200, 20_000)
  assert.ok(s.length <= 20_100)
  assert.ok(s.includes('prompt 0'))
  assert.ok(s.includes('answer 399'))
})

test('tailStart skips a split that would keep a huge turn whole', () => {
  const m = (role: 'user' | 'assistant', text: string) => ({ role, text, toolUses: [] }) as any
  const msgs = [
    m('user', 'a'), m('assistant', 'b'), m('user', 'c'), m('assistant', 'd'), m('user', 'first'),
    m('assistant', 'x'.repeat(200_000)), m('user', 'latest'), m('assistant', 'ok'),
  ]
  assert.equal(tailStart(msgs, 4), 6)
})
