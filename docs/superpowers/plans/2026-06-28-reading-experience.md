# Reading experience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reading surface and playback adjustable — line-height, column width, sans/serif, a position scrubber, manual voice-cursor nudge, and an honest editable WPM.

**Architecture:** New persisted settings drive CSS custom properties on the reader; a tiny pure `scrubRatioToPos` and `nudgeCursor` are added under TDD; the prompter gets a scrubbable progress bar and nudge keys; the editor gets an editable WPM that feeds the existing `estimateSeconds`.

**Tech Stack:** TanStack Start, React, TypeScript, Tailwind v4, Biome, Vitest (node env).

## Global Constraints

- Copy rules: sentence case, no em dash, no emoji in UI.
- Colors: only `--ls-*` / semantic tokens — never raw hex in components.
- Motion: easing `var(--ease-out)`; durations 140 / 220 / 420ms only.
- Project language is English. New i18n strings go in `en`, `pt-BR`, `ja`.
- Tests: `npm test`. Lint: `npm run lint`. Build: `npm run build`. All green.
- The serif option uses a system stack (`Georgia, 'Times New Roman', serif`) — no embedded font.
- **Dependency:** Task 8 (editor word count ignoring markers) consumes `layoutScript` from the content-portability plan. Land that plan first, or substitute `countWords` if running this plan standalone (noted in the task).
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: New typography + wpm settings

**Files:**
- Modify: `src/lib/settings.ts`
- Test: `src/lib/settings.test.ts`

**Interfaces:**
- Produces, on `PrompterSettings`: `lineHeight: number`, `columnWidth: number`, `fontFamily: 'sans' | 'serif'`, `wpm: number`. New clamps `clampLineHeight`, `clampColumnWidth`, `clampWpm` and constants. Defaults: `lineHeight 1.45`, `columnWidth 900`, `fontFamily 'sans'`, `wpm 140`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/settings.test.ts`:

```ts
import { clampColumnWidth, clampLineHeight, clampWpm, DEFAULT_SETTINGS, loadSettings } from './settings'

describe('typography settings', () => {
  it('has the new defaults', () => {
    expect(DEFAULT_SETTINGS.lineHeight).toBe(1.45)
    expect(DEFAULT_SETTINGS.columnWidth).toBe(900)
    expect(DEFAULT_SETTINGS.fontFamily).toBe('sans')
    expect(DEFAULT_SETTINGS.wpm).toBe(140)
  })
  it('clamps out-of-range values', () => {
    expect(clampLineHeight(5)).toBe(2)
    expect(clampLineHeight(0.5)).toBe(1.2)
    expect(clampColumnWidth(99999)).toBe(1100)
    expect(clampColumnWidth(10)).toBe(600)
    expect(clampWpm(9999)).toBe(260)
    expect(clampWpm(1)).toBe(80)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

In `src/lib/settings.ts`:

Add to the `PrompterSettings` interface (after `speechLang`):

```ts
  /** Reader line-height multiplier */
  lineHeight: number
  /** Reader column max width in px */
  columnWidth: number
  /** Reader font family */
  fontFamily: 'sans' | 'serif'
  /** Words per minute used for the editor duration estimate */
  wpm: number
```

Add constants (after `MARGIN_MAX`, line 39):

```ts
export const LINE_HEIGHT_MIN = 1.2
export const LINE_HEIGHT_MAX = 2
export const COLUMN_WIDTH_MIN = 600
export const COLUMN_WIDTH_MAX = 1100
export const WPM_MIN = 80
export const WPM_MAX = 260
```

Add to `DEFAULT_SETTINGS`:

```ts
  lineHeight: 1.45,
  columnWidth: 900,
  fontFamily: 'sans',
  wpm: 140,
```

Add clamp helpers (after `clampMargin`):

```ts
export function clampLineHeight(value: number): number {
  return clamp(LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, value)
}
export function clampColumnWidth(value: number): number {
  return clamp(COLUMN_WIDTH_MIN, COLUMN_WIDTH_MAX, value)
}
export function clampWpm(value: number): number {
  return Math.round(clamp(WPM_MIN, WPM_MAX, value))
}
```

Add to the object returned by `loadSettings` (after the `speechLang` line):

```ts
      lineHeight: clampLineHeight(numberOr(DEFAULT_SETTINGS.lineHeight, parsed.lineHeight)),
      columnWidth: clampColumnWidth(numberOr(DEFAULT_SETTINGS.columnWidth, parsed.columnWidth)),
      fontFamily: parsed.fontFamily === 'serif' ? 'serif' : 'sans',
      wpm: clampWpm(numberOr(DEFAULT_SETTINGS.wpm, parsed.wpm)),
```

- [ ] **Step 4: Run test to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings.ts src/lib/settings.test.ts
git commit -m "feat(settings): line-height, column width, font family, wpm

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `nudgeCursor`

**Files:**
- Modify: `src/lib/voice.ts`
- Test: `src/lib/voice.test.ts`

**Interfaces:**
- Produces: `nudgeCursor(cursor: number, delta: number, length: number): number` — clamped to `[0, length]`.

- [ ] **Step 1: Write the failing test**

```ts
describe('nudgeCursor', () => {
  it('moves and clamps', () => {
    expect(nudgeCursor(5, 1, 10)).toBe(6)
    expect(nudgeCursor(5, -1, 10)).toBe(4)
    expect(nudgeCursor(0, -1, 10)).toBe(0)
    expect(nudgeCursor(10, 1, 10)).toBe(10)
  })
})
```

(Add `nudgeCursor` to the existing `./voice` import in the test file.)

- [ ] **Step 2: Run test to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

Add to `src/lib/voice.ts`:

```ts
/** Moves the voice cursor by delta words, clamped to the token range. */
export function nudgeCursor(cursor: number, delta: number, length: number): number {
  return Math.max(0, Math.min(length, cursor + delta))
}
```

- [ ] **Step 4: Run test to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/voice.ts src/lib/voice.test.ts
git commit -m "feat(voice): add nudgeCursor

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `scrubRatioToPos`

**Files:**
- Create: `src/lib/scroll.ts`
- Test: `src/lib/scroll.test.ts`

**Interfaces:**
- Produces: `scrubRatioToPos(ratio: number, max: number): number` — `clamp(ratio, 0, 1) * max`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/scroll.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { scrubRatioToPos } from './scroll'

describe('scrubRatioToPos', () => {
  it('maps a clamped ratio onto the scroll range', () => {
    expect(scrubRatioToPos(0, 1000)).toBe(0)
    expect(scrubRatioToPos(1, 1000)).toBe(1000)
    expect(scrubRatioToPos(0.5, 1000)).toBe(500)
    expect(scrubRatioToPos(-1, 1000)).toBe(0)
    expect(scrubRatioToPos(2, 1000)).toBe(1000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/scroll.ts`:

```ts
/** Maps a scrubber ratio (0..1) onto a pixel scroll position. */
export function scrubRatioToPos(ratio: number, max: number): number {
  const clamped = Math.max(0, Math.min(1, ratio))
  return clamped * max
}
```

- [ ] **Step 4: Run test to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scroll.ts src/lib/scroll.test.ts
git commit -m "feat(scroll): add scrubRatioToPos

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: i18n keys for this theme

**Files:**
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- Produces (en / pt-BR / ja): `settings.lineHeight`, `settings.columnWidth`, `settings.fontFamily`, `settings.fontSans`, `settings.fontSerif`, `prompter.scrub` (aria-label), `prompter.nudgeBack`, `prompter.nudgeForward`, `editor.wpmLabel`.

- [ ] **Step 1: Add to `en`**

```ts
  'settings.lineHeight': 'Line spacing',
  'settings.columnWidth': 'Column width',
  'settings.fontFamily': 'Font',
  'settings.fontSans': 'Sans',
  'settings.fontSerif': 'Serif',
  'prompter.scrub': 'Scrub position',
  'prompter.nudgeBack': 'Move cursor back',
  'prompter.nudgeForward': 'Move cursor forward',
  'editor.wpmLabel': 'Words per minute',
```

- [ ] **Step 2: Add to `pt-BR`**

```ts
  'settings.lineHeight': 'Entrelinha',
  'settings.columnWidth': 'Largura da coluna',
  'settings.fontFamily': 'Fonte',
  'settings.fontSans': 'Sem serifa',
  'settings.fontSerif': 'Serifada',
  'prompter.scrub': 'Ajustar posição',
  'prompter.nudgeBack': 'Mover cursor para trás',
  'prompter.nudgeForward': 'Mover cursor para frente',
  'editor.wpmLabel': 'Palavras por minuto',
```

- [ ] **Step 3: Add to `ja`**

```ts
  'settings.lineHeight': '行間',
  'settings.columnWidth': '段の幅',
  'settings.fontFamily': 'フォント',
  'settings.fontSans': 'ゴシック',
  'settings.fontSerif': '明朝',
  'prompter.scrub': '位置を調整',
  'prompter.nudgeBack': 'カーソルを戻す',
  'prompter.nudgeForward': 'カーソルを進める',
  'editor.wpmLabel': '1分あたりの語数',
```

- [ ] **Step 4: Verify** — `npm run lint && npm run build` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): keys for typography, scrub, nudge, wpm

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Apply adjustable typography in the prompter

**Files:**
- Modify: `src/routes/prompter.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: settings fields (Task 1), i18n (Task 4).

- [ ] **Step 1: Add imports and state**

Add to the `../lib/settings` import: `clampLineHeight, clampColumnWidth, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, COLUMN_WIDTH_MIN, COLUMN_WIDTH_MAX`.

Add state (after `voiceLang`, line 177):

```tsx
  const [lineHeight, setLineHeight] = useState(initialSettings.lineHeight)
  const [columnWidth, setColumnWidth] = useState(initialSettings.columnWidth)
  const [fontFamily, setFontFamily] = useState(initialSettings.fontFamily)
```

- [ ] **Step 2: Persist them**

Add `lineHeight, columnWidth, fontFamily` to the `saveSettings({...})` object (line 193) and to its dependency array (line 206). Also include `wpm: initialSettings.wpm` in the saved object so the editor's value is preserved (read once from `initialSettings`).

- [ ] **Step 3: Apply to the reader container**

Replace the reader `<div>` (lines 760–767). Change `max-w-[900px]` and `leading-[1.45]` to driven values and add the serif class:

```tsx
          <div
            className={`mx-auto text-center font-normal text-ls-white ${fontFamily === 'serif' ? 'reader-serif' : ''}`}
            style={{
              maxWidth: `${columnWidth}px`,
              lineHeight,
              paddingTop: '55vh',
              paddingBottom: '55vh',
              fontSize: `${fontSize}px`,
              paddingLeft: `${margin}vw`,
              paddingRight: `${margin}vw`,
              textShadow: cameraVisible ? '0 1px 8px rgba(0,0,0,0.8)' : 'none',
            }}
          >
```

- [ ] **Step 4: Add the serif class**

In `src/styles.css`:

```css
.reader-serif {
  font-family: Georgia, "Times New Roman", serif;
}
```

- [ ] **Step 5: Add the controls to the settings panel**

In the settings panel (inside the `<div className="flex w-64 flex-col gap-4">`, after the margin row at line 974), add three controls:

```tsx
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="leading-range" className="text-xs text-ls-gray-500">{t('settings.lineHeight')}</label>
                <input id="leading-range" type="range" min={LINE_HEIGHT_MIN} max={LINE_HEIGHT_MAX} step={0.05}
                  value={lineHeight}
                  onChange={(e) => { setLineHeight(clampLineHeight(Number(e.target.value))); showControls() }}
                  className="h-1 w-28 cursor-pointer accent-[var(--ls-blue)]" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="width-range" className="text-xs text-ls-gray-500">{t('settings.columnWidth')}</label>
                <input id="width-range" type="range" min={COLUMN_WIDTH_MIN} max={COLUMN_WIDTH_MAX} step={20}
                  value={columnWidth}
                  onChange={(e) => { setColumnWidth(clampColumnWidth(Number(e.target.value))); showControls() }}
                  className="h-1 w-28 cursor-pointer accent-[var(--ls-blue)]" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-ls-gray-500">{t('settings.fontFamily')}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => { setFontFamily('sans'); showControls() }}
                    aria-pressed={fontFamily === 'sans'}
                    className={`rounded-btn px-2.5 py-1 text-xs transition-colors duration-[140ms] ${fontFamily === 'sans' ? 'bg-ls-blue text-ls-white' : 'text-ls-gray-500 hover:text-ls-white'}`}>
                    {t('settings.fontSans')}
                  </button>
                  <button type="button" onClick={() => { setFontFamily('serif'); showControls() }}
                    aria-pressed={fontFamily === 'serif'}
                    className={`rounded-btn px-2.5 py-1 text-xs transition-colors duration-[140ms] ${fontFamily === 'serif' ? 'bg-ls-blue text-ls-white' : 'text-ls-gray-500 hover:text-ls-white'}`}>
                    {t('settings.fontSerif')}
                  </button>
                </div>
              </div>
```

- [ ] **Step 6: Verify** — `npm run lint && npm run build` → PASS. Manual: line spacing, width, and sans/serif change the reader live and persist across reloads.

- [ ] **Step 7: Commit**

```bash
git add src/routes/prompter.tsx src/styles.css
git commit -m "feat(prompter): adjustable line-height, column width, serif

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Position scrubber on the progress bar

**Files:**
- Modify: `src/routes/prompter.tsx`

**Interfaces:**
- Consumes: `scrubRatioToPos` (Task 3), i18n `prompter.scrub` (Task 4). Reuses `syncVoiceCursor`.

- [ ] **Step 1: Import the helper**

```tsx
import { scrubRatioToPos } from '../lib/scroll'
```

- [ ] **Step 2: Add a scrub handler**

After `restart` (line 506):

```tsx
  const scrubTo = useCallback((clientX: number, el: HTMLElement) => {
    const stage = stageRef.current
    const content = contentRef.current
    if (!stage || !content) return
    const max = Math.max(0, content.scrollHeight - stage.clientHeight)
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    posRef.current = scrubRatioToPos(ratio, max)
    content.style.transform = `translate3d(0, ${-posRef.current}px, 0)`
    if (voiceActiveRef.current) syncVoiceCursor()
  }, [syncVoiceCursor])
```

- [ ] **Step 3: Make the progress bar interactive while paused**

Replace the progress bar block (lines 744–750) with a version that adds a hit area and pointer handlers, active only when not playing:

```tsx
      {/* Progress bar: hairline at the top; scrubbable while paused */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: slider semantics provided via role and arrow keys */}
      <div
        className="absolute inset-x-0 top-0 z-20 h-3 cursor-pointer"
        role="slider"
        tabIndex={0}
        aria-label={t('prompter.scrub')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPct * 100)}
        onPointerDown={(e) => {
          if (playing) return
          e.currentTarget.setPointerCapture(e.pointerId)
          scrubTo(e.clientX, e.currentTarget)
        }}
        onPointerMove={(e) => {
          if (playing || e.buttons === 0) return
          scrubTo(e.clientX, e.currentTarget)
        }}
        onKeyDown={(e) => {
          if (playing) return
          const stage = stageRef.current
          const content = contentRef.current
          if (!stage || !content) return
          const max = Math.max(0, content.scrollHeight - stage.clientHeight)
          if (e.key === 'ArrowRight') { posRef.current = Math.min(max, posRef.current + max * 0.02); content.style.transform = `translate3d(0, ${-posRef.current}px, 0)` }
          if (e.key === 'ArrowLeft') { posRef.current = Math.max(0, posRef.current - max * 0.02); content.style.transform = `translate3d(0, ${-posRef.current}px, 0)` }
        }}
      >
        <div className="relative top-0 h-0.5 bg-ls-white/10">
          <div ref={progressRef} className="h-full w-full origin-left bg-ls-blue" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
```

Note: this block depends on `progressPct` (added in the feedback-and-trust plan, Task 4). If that plan is not merged, add `const [progressPct, setProgressPct] = useState(0)` and update it in the rAF loop, or use `aria-valuenow={0}` as a fallback.

- [ ] **Step 4: Verify** — `npm run lint && npm run build` → PASS. Manual: while paused, click/drag the top bar to jump; while playing it does nothing; in voice mode the cursor and dimming realign after a scrub.

- [ ] **Step 5: Commit**

```bash
git add src/routes/prompter.tsx
git commit -m "feat(prompter): scrub position on the progress bar while paused

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Voice cursor nudge (keys + buttons)

**Files:**
- Modify: `src/routes/prompter.tsx`

**Interfaces:**
- Consumes: `nudgeCursor` (Task 2), i18n `prompter.nudgeBack`/`prompter.nudgeForward` (Task 4).

- [ ] **Step 1: Import**

Add `nudgeCursor` to the `../lib/voice` import.

- [ ] **Step 2: Extract a cursor-apply helper and a nudge callback**

The target/dimming math currently lives inline in `handleUtterance` (lines 342–350). Add a reusable helper after `handleUtterance`:

```tsx
  const applyVoiceCursor = useCallback((next: number) => {
    const index = scriptIndexRef.current
    voiceCursorRef.current = next
    const wordIndex = index.tokenToWord[next - 1]
    setSpokenBoundary(wordIndex ?? -1)
    const stage = stageRef.current
    const content = contentRef.current
    const span = wordIndex !== undefined
      ? content?.querySelector<HTMLElement>(`[data-wi="${wordIndex}"]`)
      : null
    if (!stage || !content || !span) return
    const offset = span.getBoundingClientRect().top - content.getBoundingClientRect().top
    voiceTargetRef.current = offset - stage.clientHeight * voiceAnchor()
  }, [voiceAnchor, setSpokenBoundary])

  const nudgeVoice = useCallback((delta: number) => {
    if (!voiceActiveRef.current) return
    const length = scriptIndexRef.current.tokens.length
    applyVoiceCursor(nudgeCursor(voiceCursorRef.current, delta, length))
    showControls()
  }, [applyVoiceCursor, showControls])
```

- [ ] **Step 3: Add the keyboard shortcuts**

In the `onKeyDown` switch (line 654), add two cases before `Escape`:

```tsx
        case ',':
          nudgeVoice(-1)
          break
        case '.':
          nudgeVoice(1)
          break
```

Add `nudgeVoice` to the effect's dependency array (line 704).

- [ ] **Step 4: Add overlay buttons (only when voice is listening)**

In the controls row, after the voice `<button>` block (line 1124), add:

```tsx
          {voiceListening && (
            <>
              <button type="button" onClick={() => nudgeVoice(-1)} aria-label={t('prompter.nudgeBack')} title={`${t('prompter.nudgeBack')} (,)`}
                className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white">
                <span className="text-sm leading-none">‹</span>
              </button>
              <button type="button" onClick={() => nudgeVoice(1)} aria-label={t('prompter.nudgeForward')} title={`${t('prompter.nudgeForward')} (.)`}
                className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white">
                <span className="text-sm leading-none">›</span>
              </button>
            </>
          )}
```

- [ ] **Step 5: Verify** — `npm run lint && npm run build` → PASS. Manual (mic): with voice active, `,`/`.` and the buttons move the cursor and dimming one word at a time.

- [ ] **Step 6: Commit**

```bash
git add src/routes/prompter.tsx
git commit -m "feat(prompter): manual voice cursor nudge

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Editable WPM and marker-aware word count in the editor

**Files:**
- Modify: `src/routes/editor.tsx`

**Interfaces:**
- Consumes: `loadSettings`/`saveSettings`/`clampWpm` (Task 1), `estimateSeconds` (existing), `layoutScript` (content-portability plan, Task 6).

- [ ] **Step 1: Import**

Add `clampWpm`, `loadSettings`, `saveSettings` to the `../lib/settings` import. Add `layoutScript` to the `../lib/text` import (replacing or alongside `countWords`).

- [ ] **Step 2: Add wpm state**

Near the other state (after line 47):

```tsx
  const [wpm, setWpm] = useState(140)
```

Load it once on mount — inside the existing load effect (line 58), after `setLoaded(true)` add:

```tsx
      setWpm(loadSettings().wpm)
```

- [ ] **Step 3: Compute word count without markers and duration from wpm**

Replace lines 252–253:

```tsx
  const words = layoutScript(content).words.length
  const duration = formatDuration(estimateSeconds(words, wpm))
```

(If the content-portability plan is not merged, keep `countWords(content)` instead of `layoutScript(...).words.length`.)

- [ ] **Step 4: Persist wpm on change**

Add a handler after `handleStart`:

```tsx
  const changeWpm = useCallback((value: number) => {
    const next = clampWpm(value)
    setWpm(next)
    saveSettings({ ...loadSettings(), wpm: next })
  }, [])
```

- [ ] **Step 5: Render the editable WPM in the footer**

Replace the static `{t('editor.wpmSuffix')}` usage in the footer (line 486). Instead of "at 140 wpm", render the duration plus an editable wpm field:

```tsx
                  {duration}
                  <span className="px-2 text-line">|</span>
                  <input
                    type="number"
                    min={80}
                    max={260}
                    value={wpm}
                    onChange={(e) => changeWpm(Number(e.target.value))}
                    aria-label={t('editor.wpmLabel')}
                    className="w-12 rounded-btn bg-surface-raised px-1 py-0.5 text-right text-sm tabular-nums text-secondary outline-none focus:text-primary"
                  />
                  {' wpm'}
```

(The `editor.wpmSuffix` key becomes unused; leave it in i18n to avoid churn, or remove it — reviewer's choice.)

- [ ] **Step 6: Verify** — `npm run lint && npm run build` → PASS. Manual: changing WPM updates the duration live and persists; a script with `[pause]` markers is not counted as words.

- [ ] **Step 7: Commit**

```bash
git add src/routes/editor.tsx
git commit -m "feat(editor): editable wpm and marker-aware word count

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (done)

- Spec A (typography) → Tasks 1 + 5. Spec B (scrubber) → Tasks 3 + 6. Spec C (nudge) → Tasks 2 + 7. Spec D (honest duration) → Tasks 1 + 8. i18n → Task 4.
- No placeholders; every code step shows the code.
- Cross-plan dependencies flagged: Task 6 uses `progressPct` (feedback plan Task 4); Task 8 uses `layoutScript` (portability plan Task 6). Both have standalone fallbacks noted.
- Type consistency: `scrubRatioToPos`, `nudgeCursor`, `clampWpm`, and the new settings fields match across tasks; `applyVoiceCursor` reuses the same target math as `handleUtterance`.
