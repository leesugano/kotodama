import { describe, expect, it } from 'vitest'
import {
  exportBackup,
  filenameForBackup,
  mergeBackup,
  parseBackup,
  scriptToTxt,
  txtToScript,
} from './import-export'
import type { Script } from './scripts/types'

const s = (over: Partial<Script>): Script => ({
  id: 'a',
  title: 'T',
  content: 'body',
  customTitle: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

describe('txt', () => {
  it('serializes content', () => {
    expect(scriptToTxt({ content: 'hi\nthere' })).toBe('hi\nthere')
  })
  it('builds a script from a filename and text', () => {
    expect(txtToScript('My talk.txt', 'a b')).toEqual({
      title: 'My talk',
      content: 'a b',
    })
  })
})

describe('backup round-trip', () => {
  it('exports and parses', () => {
    const json = exportBackup([s({ id: '1' })])
    const parsed = parseBackup(json)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.scripts[0].id).toBe('1')
  })
  it('rejects wrong schema and non-json', () => {
    expect(parseBackup('{"schema":99,"scripts":[]}').ok).toBe(false)
    expect(parseBackup('not json').ok).toBe(false)
    expect(parseBackup('{"schema":1}').ok).toBe(false)
  })
  it('names the file by date', () => {
    expect(filenameForBackup(new Date('2026-06-28T10:00:00Z'))).toBe(
      'kotodama-backup-2026-06-28.json',
    )
  })
})

describe('mergeBackup', () => {
  it('adds new, keeps newer on conflict, ignores older', () => {
    const existing = [
      s({ id: '1', updatedAt: 100 }),
      s({ id: '2', updatedAt: 100 }),
    ]
    const incoming = [
      s({ id: '1', updatedAt: 200 }),
      s({ id: '2', updatedAt: 50 }),
      s({ id: '3', updatedAt: 10 }),
    ]
    const r = mergeBackup(existing, incoming)
    expect(r.added).toBe(1) // id 3
    expect(r.updated).toBe(1) // id 1 (newer)
    expect(r.toSave.map((x) => x.id).sort()).toEqual(['1', '3'])
  })
})
