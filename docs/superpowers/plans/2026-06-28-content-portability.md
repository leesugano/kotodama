# Content portability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users import (.txt/.docx), export (.txt), back up/restore (.json) scripts, search the sidebar, clean pasted text, and annotate scripts with teleprompter markers — without breaking voice alignment.

**Architecture:** Pure parsing/serialization lives in a new `src/lib/import-export.ts` and in extended `text.ts` helpers (all unit-tested). The prompter's `splitSections` is moved into `text.ts` as `layoutScript`, extended to understand markers, so the rendered word index (and therefore voice alignment) stays consistent. `mammoth` is the only new dependency, dynamically imported so it stays out of the initial bundle.

**Tech Stack:** TanStack Start, React, TypeScript, Tailwind v4, Biome, Vitest (node env), mammoth.

## Global Constraints

- Copy rules: sentence case, no em dash, no emoji in UI.
- Colors: only `--ls-*` / semantic tokens — never raw hex in components.
- Motion: easing `var(--ease-out)`; durations 140 / 220 / 420ms only.
- Project language is English. New i18n strings go in `en`, `pt-BR`, `ja`.
- Tests: `npm test`. Lint: `npm run lint`. Build: `npm run build`. All green.
- Marker grammar: `[pause]`, `[breath]` (case-insensitive, bracketed, standalone); `**emphasis**` (paired asterisks, no nesting); a lone `**` or an unmatched `[` is literal text. Markers are never spoken.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `cleanText` normalization

**Files:**
- Modify: `src/lib/text.ts`
- Test: `src/lib/text.test.ts`

**Interfaces:**
- Produces: `cleanText(raw: string): string` — nbsp → space, CRLF/CR → LF, trailing spaces per line removed, 3+ consecutive blank lines collapsed to 1.

- [ ] **Step 1: Write the failing test**

```ts
import { cleanText } from './text'

describe('cleanText', () => {
  it('normalizes whitespace from pasted content', () => {
    expect(cleanText('a b')).toBe('a b')
    expect(cleanText('a\r\nb\rc')).toBe('a\nb\nc')
    expect(cleanText('a   \nb')).toBe('a\nb')
    expect(cleanText('a\n\n\n\n\nb')).toBe('a\n\nb')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → FAIL (`cleanText is not a function`).

- [ ] **Step 3: Implement**

Add to `src/lib/text.ts`:

```ts
/** Normalizes pasted/imported text: nbsp, line endings, trailing spaces, blank runs. */
export function cleanText(raw: string): string {
  return raw
    .replace(/ /g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
}
```

- [ ] **Step 4: Run test to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/text.ts src/lib/text.test.ts
git commit -m "feat(text): add cleanText normalization

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `parseMarkers`

**Files:**
- Modify: `src/lib/text.ts`
- Test: `src/lib/text.test.ts`

**Interfaces:**
- Produces:
```ts
export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'emphasis'; text: string }
  | { kind: 'pause' }
  | { kind: 'breath' }
export function parseMarkers(text: string): Segment[]
```

- [ ] **Step 1: Write the failing test**

```ts
import { parseMarkers } from './text'

describe('parseMarkers', () => {
  it('splits pause and breath into markers', () => {
    expect(parseMarkers('hello [pause] world')).toEqual([
      { kind: 'text', text: 'hello ' },
      { kind: 'pause' },
      { kind: 'text', text: ' world' },
    ])
    expect(parseMarkers('[BREATH]')).toEqual([{ kind: 'breath' }])
  })
  it('parses emphasis', () => {
    expect(parseMarkers('a **big** day')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'emphasis', text: 'big' },
      { kind: 'text', text: ' day' },
    ])
  })
  it('treats a lone ** and unknown brackets as literal text', () => {
    expect(parseMarkers('a ** b')).toEqual([{ kind: 'text', text: 'a ** b' }])
    expect(parseMarkers('[foo]')).toEqual([{ kind: 'text', text: '[foo]' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

```ts
const MARKER_RE = /\[(pause|breath)\]|\*\*([^*]+?)\*\*/gi

export function parseMarkers(text: string): Segment[] {
  const segments: Segment[] = []
  let last = 0
  for (const m of text.matchAll(MARKER_RE)) {
    const i = m.index ?? 0
    if (i > last) segments.push({ kind: 'text', text: text.slice(last, i) })
    if (m[1]) {
      segments.push({ kind: m[1].toLowerCase() === 'pause' ? 'pause' : 'breath' })
    } else if (m[2]) {
      segments.push({ kind: 'emphasis', text: m[2] })
    }
    last = i + m[0].length
  }
  if (last < text.length) segments.push({ kind: 'text', text: text.slice(last) })
  return segments
}
```

- [ ] **Step 4: Run test to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/text.ts src/lib/text.test.ts
git commit -m "feat(text): add parseMarkers for teleprompter markers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Voice tokenizer ignores markers (regression guard)

**Files:**
- Modify: `src/lib/voice.ts`
- Test: `src/lib/voice.test.ts`

**Interfaces:**
- Consumes: nothing new. Hardens `tokenize` so a standalone `[pause]`/`[breath]` produces no tokens even if it reaches the tokenizer.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/voice.test.ts`:

```ts
describe('tokenize ignores markers', () => {
  it('drops standalone pause/breath markers', () => {
    expect(tokenize('hello [pause] world')).toEqual(['hello', 'world'])
    expect(tokenize('[BREATH]')).toEqual([])
  })
  it('keeps emphasized words spoken', () => {
    expect(tokenize('a **big** day')).toEqual(['a', 'big', 'day'])
  })
})
```

(`tokenize` is already imported in the test file; if not, add `import { tokenize } from './voice'`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → FAIL: `tokenize('[BREATH]')` currently returns `['breath']` (brackets are stripped as punctuation), not `[]`.

- [ ] **Step 3: Implement**

In `src/lib/voice.ts` `tokenize`, inside the `for (const raw of text.split(/\s+/))` loop, before cleaning, skip recognized markers:

```ts
  const MARKER = /^\[(pause|breath)\]$/i
  for (const raw of text.split(/\s+/)) {
    if (MARKER.test(raw)) continue
    const cleaned = raw
      .normalize('NFD')
      ...
```

(`**big**` already tokenizes to `big` because the existing regex strips `*`, so no change is needed for emphasis.)

- [ ] **Step 4: Run test to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/voice.ts src/lib/voice.test.ts
git commit -m "fix(voice): tokenizer ignores pause/breath markers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Import/export/backup module

**Files:**
- Create: `src/lib/import-export.ts`
- Test: `src/lib/import-export.test.ts`
- Modify: `package.json` (add `mammoth`)

**Interfaces:**
- Produces:
```ts
export interface NewScriptInput { title: string; content: string }
export function scriptToTxt(script: { content: string }): string
export function txtToScript(filename: string, text: string): NewScriptInput
export function filenameForBackup(date: Date): string   // "kotodama-backup-YYYY-MM-DD.json"
export function exportBackup(scripts: Script[]): string  // pretty JSON, { schema:1, exportedAt, scripts }
export function parseBackup(text: string): { ok: true; scripts: Script[] } | { ok: false; error: string }
export function mergeBackup(existing: Script[], incoming: Script[]): { toSave: Script[]; updated: number; added: number }
export function downloadText(filename: string, text: string, type?: string): void  // browser only
export function docxToText(file: File): Promise<string>  // browser only, dynamic mammoth import
```

- [ ] **Step 1: Add the dependency**

Run: `npm install mammoth`
Expected: `mammoth` appears in `package.json` dependencies.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/import-export.test.ts`:

```ts
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
  id: 'a', title: 'T', content: 'body', customTitle: false,
  createdAt: 1, updatedAt: 1, ...over,
})

describe('txt', () => {
  it('serializes content', () => {
    expect(scriptToTxt({ content: 'hi\nthere' })).toBe('hi\nthere')
  })
  it('builds a script from a filename and text', () => {
    expect(txtToScript('My talk.txt', 'a b')).toEqual({ title: 'My talk', content: 'a b' })
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
    expect(filenameForBackup(new Date('2026-06-28T10:00:00Z')))
      .toBe('kotodama-backup-2026-06-28.json')
  })
})

describe('mergeBackup', () => {
  it('adds new, keeps newer on conflict, ignores older', () => {
    const existing = [s({ id: '1', updatedAt: 100 }), s({ id: '2', updatedAt: 100 })]
    const incoming = [s({ id: '1', updatedAt: 200 }), s({ id: '2', updatedAt: 50 }), s({ id: '3', updatedAt: 10 })]
    const r = mergeBackup(existing, incoming)
    expect(r.added).toBe(1)            // id 3
    expect(r.updated).toBe(1)          // id 1 (newer)
    expect(r.toSave.map((x) => x.id).sort()).toEqual(['1', '3'])
  })
})
```

- [ ] **Step 3: Run test to verify it fails** — `npm test` → FAIL (module missing).

- [ ] **Step 4: Implement**

Create `src/lib/import-export.ts`:

```ts
import { cleanText } from './text'
import type { Script } from './scripts/types'

export interface NewScriptInput {
  title: string
  content: string
}

const BACKUP_SCHEMA = 1

export function scriptToTxt(script: { content: string }): string {
  return script.content
}

export function txtToScript(filename: string, text: string): NewScriptInput {
  const title = filename.replace(/\.[^.]+$/, '').trim() || 'Untitled'
  return { title, content: cleanText(text) }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function filenameForBackup(date: Date): string {
  const y = date.getUTCFullYear()
  const m = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  return `kotodama-backup-${y}-${m}-${d}.json`
}

export function exportBackup(scripts: Script[]): string {
  return JSON.stringify(
    { schema: BACKUP_SCHEMA, exportedAt: new Date().toISOString(), scripts },
    null,
    2,
  )
}

function isScript(v: unknown): v is Script {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.content === 'string' &&
    typeof o.createdAt === 'number' &&
    typeof o.updatedAt === 'number'
  )
}

export function parseBackup(
  text: string,
): { ok: true; scripts: Script[] } | { ok: false; error: string } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  if (typeof data !== 'object' || data === null) return { ok: false, error: 'invalid-shape' }
  const o = data as Record<string, unknown>
  if (o.schema !== BACKUP_SCHEMA) return { ok: false, error: 'unsupported-schema' }
  if (!Array.isArray(o.scripts) || !o.scripts.every(isScript)) {
    return { ok: false, error: 'invalid-scripts' }
  }
  return { ok: true, scripts: o.scripts as Script[] }
}

export function mergeBackup(
  existing: Script[],
  incoming: Script[],
): { toSave: Script[]; updated: number; added: number } {
  const byId = new Map(existing.map((s) => [s.id, s]))
  const toSave: Script[] = []
  let updated = 0
  let added = 0
  for (const inc of incoming) {
    const cur = byId.get(inc.id)
    if (!cur) {
      toSave.push(inc)
      added++
    } else if (inc.updatedAt > cur.updatedAt) {
      toSave.push(inc)
      updated++
    }
  }
  return { toSave, updated, added }
}

/** Triggers a client-side download. Browser only. */
export function downloadText(filename: string, text: string, type = 'text/plain'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Extracts raw text from a .docx file. Browser only; mammoth is loaded on demand. */
export async function docxToText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
```

- [ ] **Step 5: Run test to verify it passes** — `npm test` → PASS. Then `npm run lint && npm run build` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/import-export.ts src/lib/import-export.test.ts package.json package-lock.json
git commit -m "feat(import-export): txt/docx import, txt export, json backup

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Repository `saveMany`

**Files:**
- Modify: `src/lib/scripts/types.ts`, `src/lib/scripts/indexeddb-repository.ts`, `src/lib/scripts/repository.ts` (no change — re-exports interface)

**Interfaces:**
- Produces: `ScriptRepository.saveMany(scripts: Script[]): Promise<void>`.

- [ ] **Step 1: Add to the interface**

In `src/lib/scripts/types.ts`, inside `ScriptRepository`, after `save`:

```ts
  saveMany(scripts: Script[]): Promise<void>
```

- [ ] **Step 2: Implement in the IndexedDB repository**

In `src/lib/scripts/indexeddb-repository.ts`, after `save`:

```ts
  async saveMany(scripts: Script[]): Promise<void> {
    if (scripts.length === 0) return
    const db = await this.db()
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    await Promise.all(scripts.map((s) => requestToPromise(store.put(s))))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
```

- [ ] **Step 3: Verify** — `npm run lint && npm run build` → PASS (interface now satisfied).

- [ ] **Step 4: Commit**

```bash
git add src/lib/scripts/types.ts src/lib/scripts/indexeddb-repository.ts
git commit -m "feat(scripts): add saveMany for batch restore

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Move `splitSections` to `text.ts` as `layoutScript` with markers

**Files:**
- Modify: `src/lib/text.ts`, `src/routes/prompter.tsx`, `src/styles.css`
- Test: `src/lib/text.test.ts`

**Interfaces:**
- Produces:
```ts
export interface WordChunk {
  text: string
  wordIndex: number | null
  marker?: 'pause' | 'breath'
  emphasis?: boolean
}
export interface ScriptLayout {
  sections: { chunks: WordChunk[] }[]
  words: string[]
}
export function layoutScript(content: string): ScriptLayout
```
- Consumes: `parseMarkers` (Task 2). Replaces the local `splitSections` in `prompter.tsx`.

- [ ] **Step 1: Write the failing test**

```ts
import { layoutScript } from './text'

describe('layoutScript', () => {
  it('indexes words and excludes markers from the word list', () => {
    const { sections, words } = layoutScript('hello [pause] big world')
    expect(words).toEqual(['hello', 'big', 'world'])
    const markers = sections[0].chunks.filter((c) => c.marker)
    expect(markers).toHaveLength(1)
    expect(markers[0].marker).toBe('pause')
  })
  it('marks emphasized words', () => {
    const { sections } = layoutScript('a **big** day')
    const emph = sections[0].chunks.find((c) => c.emphasis)
    expect(emph?.text).toBe('big')
  })
  it('splits on --- section breaks', () => {
    const { sections } = layoutScript('one\n---\ntwo')
    expect(sections).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement `layoutScript` in `text.ts`**

```ts
/* A standalone line with 3+ hyphens splits the script into sections. */
const SECTION_BREAK = /^[\t ]*-{3,}[\t ]*$/m

function pushWords(
  chunks: WordChunk[],
  words: string[],
  text: string,
  emphasis: boolean,
): void {
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      chunks.push({ text: part, wordIndex: null })
    } else {
      words.push(part)
      chunks.push({ text: part, wordIndex: words.length - 1, ...(emphasis ? { emphasis: true } : {}) })
    }
  }
}

export function layoutScript(content: string): ScriptLayout {
  const words: string[] = []
  const sections = content
    .split(SECTION_BREAK)
    .map((part) => part.replace(/^\n+|\n+$/g, ''))
    .filter((part) => part.length > 0)
    .map((part) => {
      const chunks: WordChunk[] = []
      for (const seg of parseMarkers(part)) {
        if (seg.kind === 'pause' || seg.kind === 'breath') {
          chunks.push({ text: '', wordIndex: null, marker: seg.kind })
        } else {
          pushWords(chunks, words, seg.text, seg.kind === 'emphasis')
        }
      }
      return { chunks }
    })
  return { sections, words }
}
```

- [ ] **Step 4: Run test to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Replace `splitSections` usage in `prompter.tsx`**

Delete the local `splitSections` function and `SectionChunks` interface (lines 121–147). Update the import from `../lib/text` to include `layoutScript` and the `WordChunk` type. Replace the `useMemo` at line 222:

```tsx
  const { sections, words } = useMemo(() => layoutScript(script.content), [script.content])
```

In the render (lines 778–792), update the chunk mapping to handle markers and emphasis. Replace the inner `<p>` map body:

```tsx
                <p className="whitespace-pre-wrap">
                  {section.chunks.map((chunk, chunkIndex) => {
                    if (chunk.marker) {
                      return (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: chunks derive from the text and only change together
                          key={chunkIndex}
                          aria-hidden
                          className="marker"
                        >
                          {chunk.marker === 'pause' ? t('prompter.markerPause') : t('prompter.markerBreath')}
                        </span>
                      )
                    }
                    if (chunk.wordIndex === null) return chunk.text
                    return (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: chunks derive from the text and only change together
                        key={chunkIndex}
                        data-wi={chunk.wordIndex}
                        className={chunk.emphasis ? 'font-medium' : undefined}
                      >
                        {chunk.text}
                      </span>
                    )
                  })}
                </p>
```

Add i18n keys `prompter.markerPause` ("pause") and `prompter.markerBreath` ("breath") in Task 8 (this task depends on Task 8 for those two keys — implement Task 8 first or add these two keys inline here).

- [ ] **Step 6: Add the marker chip style**

In `src/styles.css`, near `.spoken` (line ~175):

```css
.marker {
  display: inline-block;
  margin: 0 0.25em;
  padding: 0.05em 0.5em;
  border-radius: 999px;
  font-size: 0.55em;
  letter-spacing: 0.04em;
  vertical-align: middle;
  text-transform: uppercase;
  color: var(--ls-gray-500);
  border: 1px solid rgb(255 255 255 / 0.2);
}
```

- [ ] **Step 7: Verify** — `npm test && npm run lint && npm run build` → PASS. Manual: a script with `[pause]` shows a small chip; `**word**` renders heavier; voice tracking still aligns (markers do not shift the cursor).

- [ ] **Step 8: Commit**

```bash
git add src/lib/text.ts src/lib/text.test.ts src/routes/prompter.tsx src/styles.css
git commit -m "feat(prompter): render teleprompter markers via layoutScript

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: i18n keys for this theme

**Files:**
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- Produces keys (en / pt-BR / ja):
  - `editor.import`, `editor.export`, `editor.backup`, `editor.restore`
  - `editor.search` (placeholder), `editor.noMatches`
  - `editor.importError`, `editor.restoreConfirm` (with `{added}` and `{updated}` params), `editor.restoreDone` (with `{n}`)
  - `editor.markerHelp` (one line documenting the grammar)
  - `prompter.markerPause`, `prompter.markerBreath`

- [ ] **Step 1: Add to `en`**

```ts
  'editor.import': 'Import',
  'editor.export': 'Export',
  'editor.backup': 'Back up all',
  'editor.restore': 'Restore',
  'editor.search': 'Search scripts',
  'editor.noMatches': 'No matches',
  'editor.importError': "Couldn't read that file",
  'editor.restoreConfirm': 'Restore {added} new and update {updated}?',
  'editor.restoreDone': 'Restored {n} scripts',
  'editor.markerHelp': 'Markers: [pause], [breath], **emphasis** — shown to you, never read aloud',
  'prompter.markerPause': 'pause',
  'prompter.markerBreath': 'breath',
```

- [ ] **Step 2: Add to `pt-BR`**

```ts
  'editor.import': 'Importar',
  'editor.export': 'Exportar',
  'editor.backup': 'Backup de tudo',
  'editor.restore': 'Restaurar',
  'editor.search': 'Buscar roteiros',
  'editor.noMatches': 'Nenhum resultado',
  'editor.importError': 'Não foi possível ler o arquivo',
  'editor.restoreConfirm': 'Restaurar {added} novos e atualizar {updated}?',
  'editor.restoreDone': '{n} roteiros restaurados',
  'editor.markerHelp': 'Marcadores: [pause], [breath], **ênfase** — só para você, nunca são lidos',
  'prompter.markerPause': 'pausa',
  'prompter.markerBreath': 'respira',
```

- [ ] **Step 3: Add to `ja`**

```ts
  'editor.import': 'インポート',
  'editor.export': 'エクスポート',
  'editor.backup': 'すべてバックアップ',
  'editor.restore': '復元',
  'editor.search': '台本を検索',
  'editor.noMatches': '一致なし',
  'editor.importError': 'ファイルを読み込めませんでした',
  'editor.restoreConfirm': '新規{added}件を復元し、{updated}件を更新しますか？',
  'editor.restoreDone': '{n}件の台本を復元しました',
  'editor.markerHelp': 'マーカー: [pause]、[breath]、**強調** — 表示のみ、読み上げません',
  'prompter.markerPause': '休止',
  'prompter.markerBreath': '呼吸',
```

- [ ] **Step 4: Verify** — `npm run lint && npm run build` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): keys for import/export, search, markers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Editor wiring — import/export/backup/restore, search, paste cleanup, marker help

**Files:**
- Modify: `src/routes/editor.tsx`

**Interfaces:**
- Consumes: `import-export.ts` functions (Task 4), `saveMany` (Task 5), `cleanText` (Task 1), i18n keys (Task 7).

- [ ] **Step 1: Add imports**

```tsx
import { cleanText } from '../lib/text'
import {
  docxToText, downloadText, exportBackup, filenameForBackup,
  mergeBackup, parseBackup, scriptToTxt, txtToScript,
} from '../lib/import-export'
```

- [ ] **Step 2: Add state and a hidden file input ref**

Near the other state (after line 47):

```tsx
  const [query, setQuery] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)
  const restoreInputRef = useRef<HTMLInputElement>(null)
  const [restorePrompt, setRestorePrompt] = useState<{ added: number; updated: number; toSave: Script[] } | null>(null)
```

- [ ] **Step 3: Add handlers**

After `handleStart` (line 250):

```tsx
  const handleExport = useCallback(() => {
    if (!currentIdRef.current) return
    const title = metaRef.current.customTitle ? metaRef.current.title : deriveTitle(contentRef.current)
    downloadText(`${title || 'script'}.txt`, scriptToTxt({ content: contentRef.current }))
  }, [])

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const text = file.name.toLowerCase().endsWith('.docx')
        ? await docxToText(file)
        : await file.text()
      await flushPending()
      const input = txtToScript(file.name, text)
      const script: Script = {
        id: crypto.randomUUID(), title: input.title, content: input.content,
        customTitle: true, createdAt: Date.now(), updatedAt: Date.now(),
      }
      await getScriptRepository().save(script)
      setScripts((prev) => sortByUpdated([script, ...prev]))
      await selectScript(script)
    } catch {
      window.alert(t('editor.importError'))
    }
  }, [flushPending, selectScript])

  const handleBackup = useCallback(async () => {
    const all = await getScriptRepository().list()
    downloadText(filenameForBackup(new Date()), exportBackup(all), 'application/json')
  }, [])

  const handleRestoreFile = useCallback(async (file: File) => {
    const parsed = parseBackup(await file.text())
    if (!parsed.ok) {
      window.alert(t('editor.importError'))
      return
    }
    const existing = await getScriptRepository().list()
    const { toSave, added, updated } = mergeBackup(existing, parsed.scripts)
    if (toSave.length === 0) return
    setRestorePrompt({ added, updated, toSave })
  }, [])

  const confirmRestore = useCallback(async () => {
    if (!restorePrompt) return
    await getScriptRepository().saveMany(restorePrompt.toSave)
    const list = await getScriptRepository().list()
    setScripts(list)
    setRestorePrompt(null)
  }, [restorePrompt])
```

- [ ] **Step 4: Paste cleanup on the textarea**

Add an `onPaste` handler to the `<textarea>` (line 469):

```tsx
            onPaste={(e) => {
              e.preventDefault()
              const text = cleanText(e.clipboardData.getData('text/plain'))
              const el = e.currentTarget
              const start = el.selectionStart ?? content.length
              const end = el.selectionEnd ?? content.length
              const next = content.slice(0, start) + text + content.slice(end)
              handleChange(next)
              requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + text.length
              })
            }}
```

- [ ] **Step 5: Filter the list by query**

Replace `scripts.map(...)` iteration source with a filtered list. Before the sidebar JSX (after line 254), compute:

```tsx
  const visibleScripts = query.trim()
    ? scripts.filter((s) => {
        const q = query.toLowerCase()
        return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
      })
    : scripts
```

In the sidebar, change `{scripts.length === 0 && (...)}` to check `visibleScripts.length` and show `t('editor.noMatches')` when a query is active but empty; and change `{scripts.map(` to `{visibleScripts.map(`.

- [ ] **Step 6: Add the search field and toolbar to the sidebar header**

In the sidebar header block (lines 258–271), under the title row, add a search input and the action buttons. Insert after the header `<div>`:

```tsx
      <div className="border-b border-line px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('editor.search')}
          aria-label={t('editor.search')}
          className="w-full rounded-input border border-line bg-surface px-2 py-1.5 text-sm text-primary outline-none focus:border-ls-blue"
        />
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => importInputRef.current?.click()} className="text-secondary hover:text-primary">{t('editor.import')}</button>
          <button type="button" onClick={handleExport} className="text-secondary hover:text-primary">{t('editor.export')}</button>
          <button type="button" onClick={handleBackup} className="text-secondary hover:text-primary">{t('editor.backup')}</button>
          <button type="button" onClick={() => restoreInputRef.current?.click()} className="text-secondary hover:text-primary">{t('editor.restore')}</button>
        </div>
      </div>
```

- [ ] **Step 7: Add hidden file inputs and the restore confirm**

Inside the outer editor `<div>` (before `<InstallPrompt />` at line 505):

```tsx
      <input ref={importInputRef} type="file" accept=".txt,.docx" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = '' }} />
      <input ref={restoreInputRef} type="file" accept=".json,application/json" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestoreFile(f); e.target.value = '' }} />
      {restorePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ls-black/40 px-4">
          <div className="w-full max-w-sm rounded-card bg-surface p-5">
            <p className="text-sm text-primary">{t('editor.restoreConfirm', { added: restorePrompt.added, updated: restorePrompt.updated })}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRestorePrompt(null)} className="rounded-btn px-3 py-1.5 text-sm text-secondary hover:text-primary">{t('editor.cancel')}</button>
              <button type="button" onClick={confirmRestore} className="rounded-btn bg-ls-blue px-3 py-1.5 text-sm text-ls-white hover:bg-ls-blue-pressed">{t('editor.restore')}</button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 8: Add the marker help line in the footer**

In the footer, after the status `<p>` (Task 3 of theme 1 may also touch this footer — keep both), add a muted line:

```tsx
            <span className="hidden text-xs text-secondary sm:block">{t('editor.markerHelp')}</span>
```

(If theme 1 is not yet merged, place it as a standalone line in the footer row; resolve any conflict by keeping both the save status and the marker help.)

- [ ] **Step 9: Verify** — `npm run lint && npm run build` → PASS. Manual smoke (`npm run dev`): import a .txt creates a new script; export downloads it; backup downloads json; restore shows the confirm and applies; search filters; pasting strips nbsp/extra blank lines.

- [ ] **Step 10: Commit**

```bash
git add src/routes/editor.tsx
git commit -m "feat(editor): import/export/backup/restore, search, paste cleanup

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (done)

- Spec A (module) → Task 4. Spec B (editor wiring) → Tasks 5 + 8. Spec C (cleanup) → Tasks 1 + 8. Spec D (markers) → Tasks 2 + 3 + 6. Search → Task 8. i18n → Task 7.
- No placeholders; every code step shows the code. Task 6 step 5 notes its dependency on the two `prompter.marker*` keys (Task 7) — implement Task 7 before Task 6's UI step, or add those two keys inline.
- Type consistency: `NewScriptInput`, `Segment`, `WordChunk`, `ScriptLayout`, and the `parseBackup`/`mergeBackup` return shapes match across tasks.
- Ordering: Tasks 1–5 and 7 are independent; Task 6 depends on Task 2; Task 8 depends on 1/4/5/7.
