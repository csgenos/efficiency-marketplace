// Run: node --test context-guard/tests/
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { addSpan, clean, collapseRuns, compress, isCovered, isReadCommand, readSpan } from '../hooks/compress.ts'

test('small output is left alone', () => {
  assert.equal(compress('ok\n'.repeat(10)), null)
})

test('keeps every error line from a long log, drops the noise', () => {
  const lines = Array.from({ length: 2000 }, (_, i) => `compiling module_${i} [ok] took ${i % 97}ms with a long tail of padding text`)
  lines[1200] = 'ERROR: cannot resolve symbol FooBar in src/app.ts:41'
  lines[1500] = 'Traceback (most recent call last):'
  const r = compress(lines.join('\n'))
  assert.ok(r)
  assert.ok(r.text.includes('ERROR: cannot resolve symbol FooBar'))
  assert.ok(r.text.includes('Traceback (most recent call last):'))
  assert.ok(r.text.includes(lines[1999]!), 'keeps the tail')
  assert.ok(r.text.length < 12000)
})

test('collapses progress-bar runs but keeps first and last', () => {
  const out = collapseRuns(['start', 'Downloading 1%', 'Downloading 2%', 'Downloading 3%', 'Downloading 99%', 'done'])
  assert.deepEqual(out, ['start', 'Downloading 1%', '… 2 similar lines', 'Downloading 99%', 'done'])
})

test('strips ANSI and carriage-return frames', () => {
  assert.deepEqual(clean('\x1b[32mgreen\x1b[0m\n10%\r50%\r100%'), ['green', '100%'])
})

test('read commands are never trimmed', () => {
  assert.ok(isReadCommand('cat src/app.ts'))
  assert.ok(isReadCommand('cd x && git diff HEAD~1'))
  assert.ok(isReadCommand('Get-Content src/app.ts -Raw'))
  assert.ok(!isReadCommand('npm test'))
  assert.ok(!isReadCommand('npm run build | grep warn'))
})

test('read spans merge and cover', () => {
  let spans = addSpan([], readSpan(1, 100))
  spans = addSpan(spans, readSpan(101, 100))
  assert.deepEqual(spans, [[1, 200]])
  assert.ok(isCovered(spans, readSpan(50, 100)))
  assert.ok(!isCovered(spans, readSpan(150, 100)))
  assert.ok(isCovered(addSpan([], readSpan(undefined, undefined)), readSpan(1500, 20)))
})

test('a saving too small to matter is skipped', () => {
  const text = 'x'.repeat(6500)
  assert.equal(compress(text), null)
})
