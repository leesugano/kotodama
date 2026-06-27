# Feedback and trust — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app communicate its state — autosave confirmation, playback time, end-of-script and permission-error handling, and consistent focus rings.

**Architecture:** One pure helper (`formatClock`) added under TDD in `text.ts`; the rest are local changes to `editor.tsx`, `prompter.tsx`, `voice.ts`, `styles.css`, and new i18n keys. No new dependencies, no new files.

**Tech Stack:** TanStack Start, React, TypeScript, Tailwind v4, Biome, Vitest (node env).

## Global Constraints

- Copy rules: sentence case, no em dash, no emoji in UI.
- Colors: only `--ls-*` / semantic tokens (`text-primary`, `bg-surface`, etc.) — never raw hex in components.
- Motion: easing `cubic-bezier(0.16, 1, 0.3, 1)` (`var(--ease-out)`); durations 140 / 220 / 420ms only.
- Project language is English (code, comments, copy). New i18n strings go in all three dictionaries: `en`, `pt-BR`, `ja`.
- Tests: `npm test`. Lint: `npm run lint`. Build: `npm run build`. All three must stay green.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `formatClock` time helper

**Files:**
- Modify: `src/lib/text.ts`
- Test: `src/lib/text.test.ts`

**Interfaces:**
- Produces: `formatClock(totalSeconds: number): string` — returns `"m:ss"` (minutes uncapped, seconds zero-padded to 2). Negative or NaN input clamps to `0:00`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/text.test.ts`:

```ts
import { formatClock } from './text'

describe('formatClock', () => {
  it('formats seconds as m:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(600)).toBe('10:00')
    expect(formatClock(3725)).toBe('62:05')
  })
  it('clamps invalid input to 0:00', () => {
    expect(formatClock(-5)).toBe('0:00')
    expect(formatClock(Number.NaN)).toBe('0:00')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `formatClock is not a function`.

- [ ] **Step 3: Implement**

Add to `src/lib/text.ts` (after `formatDuration`):

```ts
/** Playback clock as m:ss (minutes uncapped). Invalid input becomes 0:00. */
export function formatClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/text.ts src/lib/text.test.ts
git commit -m "feat(text): add formatClock m:ss helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: i18n keys for this theme

**Files:**
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- Produces these keys (used by Tasks 3–5), added to the `en`, `pt-BR`, and `ja` dictionaries:
  - `editor.saving`, `editor.saved`, `editor.saveError`
  - `prompter.endTitle`, `prompter.restartFull` (button "Restart"), `prompter.endBack` (button "Back to editor")
  - `prompter.tryAgain`
  - `prompter.timeLabel` (aria-label for the time readout)

- [ ] **Step 1: Add keys to the `en` dictionary**

Insert near the other `editor.*` keys:

```ts
  'editor.saving': 'Saving…',
  'editor.saved': 'Saved',
  'editor.saveError': "Couldn't save",
```

Insert near the other `prompter.*` keys:

```ts
  'prompter.endTitle': 'End of script',
  'prompter.restartFull': 'Restart',
  'prompter.endBack': 'Back to editor',
  'prompter.tryAgain': 'Try again',
  'prompter.timeLabel': 'Playback time',
```

- [ ] **Step 2: Mirror the same keys in `pt-BR`**

```ts
  'editor.saving': 'Salvando…',
  'editor.saved': 'Salvo',
  'editor.saveError': 'Não foi possível salvar',
  'prompter.endTitle': 'Fim do roteiro',
  'prompter.restartFull': 'Reiniciar',
  'prompter.endBack': 'Voltar ao editor',
  'prompter.tryAgain': 'Tentar de novo',
  'prompter.timeLabel': 'Tempo de reprodução',
```

- [ ] **Step 3: Mirror the same keys in `ja`**

```ts
  'editor.saving': '保存中…',
  'editor.saved': '保存しました',
  'editor.saveError': '保存できませんでした',
  'prompter.endTitle': '台本の終わり',
  'prompter.restartFull': '最初から',
  'prompter.endBack': 'エディターに戻る',
  'prompter.tryAgain': '再試行',
  'prompter.timeLabel': '再生時間',
```

- [ ] **Step 4: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: PASS (no missing-key type errors; the dictionaries are typed against `en`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): keys for save status, end-of-script, retry, time

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Autosave indicator in the editor

**Files:**
- Modify: `src/routes/editor.tsx`

**Interfaces:**
- Consumes: i18n keys `editor.saving`/`editor.saved`/`editor.saveError` (Task 2).

- [ ] **Step 1: Add save status state**

In `EditorPage`, near the other `useState` calls (after line 47):

```tsx
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

- [ ] **Step 2: Drive status from `persist`**

In `persist` (line 84), wrap the `save` call so status reflects the result. Replace the line `await getScriptRepository().save(script)` with:

```tsx
    try {
      await getScriptRepository().save(script)
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
```

- [ ] **Step 3: Set `saving` on keystroke**

In `handleChange` (line 118), after `setContent(text)`:

```tsx
      setSaveStatus('saving')
```

- [ ] **Step 4: Clean up the timer on unmount**

In the unmount effect at line 130, add inside the returned cleanup:

```tsx
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
```

- [ ] **Step 5: Render the indicator in the footer**

In the footer `<p>` block (lines 481–491), the status line sits next to the word count. Replace the footer `<p>...</p>` with a flex row that keeps the existing content and appends the status:

```tsx
            <p className="flex items-center gap-2 text-sm text-secondary">
              {hasText ? (
                <>
                  {words} {words === 1 ? t('editor.word') : t('editor.words')}
                  <span className="px-2 text-line">|</span>
                  {duration} {t('editor.wpmSuffix')}
                </>
              ) : (
                t('editor.startHint')
              )}
              {saveStatus === 'saving' && (
                <span className="text-secondary">· {t('editor.saving')}</span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-secondary">
                  · <Check size={13} strokeWidth={1.5} aria-hidden /> {t('editor.saved')}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-ls-blue">· {t('editor.saveError')}</span>
              )}
            </p>
```

(`Check` is already imported from `lucide-react` at line 5.)

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Manual smoke (`npm run dev`): typing shows "Saving…" then "Saved" with a check that fades after ~2s.

- [ ] **Step 7: Commit**

```bash
git add src/routes/editor.tsx
git commit -m "feat(editor): autosave status indicator

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Playback time readout in the prompter

**Files:**
- Modify: `src/routes/prompter.tsx`

**Interfaces:**
- Consumes: `formatClock` (Task 1), i18n `prompter.timeLabel` (Task 2).

- [ ] **Step 1: Import the helper**

Add to the existing `../lib/text` import (there is none yet in prompter.tsx — add a new import near line 25):

```tsx
import { formatClock } from '../lib/text'
```

- [ ] **Step 2: Add elapsed tracking refs and state**

Near the other refs (after line 162):

```tsx
  const elapsedRef = useRef(0)
  const lastTimeWriteRef = useRef(0)
  const [elapsed, setElapsed] = useState(0)
  const [progressPct, setProgressPct] = useState(0)
```

- [ ] **Step 3: Accumulate elapsed and progress in the rAF loop**

In the `tick` function (lines 387–423), inside `if (playingRef.current) { ... }` add elapsed accumulation, and after computing `progress` (line 409) throttle writes to state. Specifically:

After `posRef.current += ...` branches and the clamp at line 406, add:

```tsx
        if (playingRef.current) elapsedRef.current += dt
        const progress = max > 0 ? posRef.current / max : 0
        if (ts - lastTimeWriteRef.current > 250) {
          lastTimeWriteRef.current = ts
          setElapsed(elapsedRef.current)
          setProgressPct(progress)
        }
```

Remove the now-duplicate local `const progress = ...` that was inside the `if (progressRef.current)` block — reuse the one above:

```tsx
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${progress})`
        }
```

- [ ] **Step 4: Reset elapsed on restart**

In `restart` (line 500), add:

```tsx
    elapsedRef.current = 0
    setElapsed(0)
    setProgressPct(0)
```

- [ ] **Step 5: Compute the total and render the readout**

Add a derived total above the return (after line 716 `const cameraVisible = ...`):

```tsx
  const totalSeconds = speed > 0 ? Math.round((contentRef.current && stageRef.current
    ? Math.max(0, contentRef.current.scrollHeight - stageRef.current.clientHeight) : 0) / speed) : 0
  const timeText = voiceListening
    ? `${formatClock(elapsed)} · ${Math.round(progressPct * 100)}%`
    : `${formatClock(elapsed)} / ${formatClock(totalSeconds)}`
```

Render it just below the progress bar div (after line 750), inside the mirrored-stage sibling area but above controls — place it in the controls overlay so it follows auto-hide. Inside the controls overlay `<div>` (after the opening at line 832, before the notice block):

```tsx
        <p
          className="mx-auto mb-2 w-fit rounded-card bg-ls-gray-900/95 px-3 py-1 text-xs tabular-nums text-ls-gray-500"
          aria-label={t('prompter.timeLabel')}
        >
          {timeText}
        </p>
```

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Manual smoke: in constant mode the readout counts up and shows a total; toggling voice shows elapsed + percent.

- [ ] **Step 7: Commit**

```bash
git add src/routes/prompter.tsx
git commit -m "feat(prompter): elapsed/total time readout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: End-of-script overlay (constant + voice modes)

**Files:**
- Modify: `src/routes/prompter.tsx`

**Interfaces:**
- Consumes: i18n `prompter.endTitle`/`prompter.restartFull`/`prompter.endBack` (Task 2). Reuses `restart` and `exit`.

- [ ] **Step 1: Add ended state**

After the other `useState` calls (near line 182):

```tsx
  const [ended, setEnded] = useState(false)
```

- [ ] **Step 2: Set ended at constant-mode auto-stop**

In the rAF loop, the auto-stop block (lines 412–420) currently calls `setPlaying(false)`. Add `setEnded(true)` there:

```tsx
        if (
          playingRef.current &&
          !voiceActiveRef.current &&
          max > 0 &&
          posRef.current >= max
        ) {
          setPlaying(false)
          setControlsVisible(true)
          setEnded(true)
        }
```

- [ ] **Step 3: Set ended when voice reaches the last token**

In `handleUtterance` (line 333), after `voiceCursorRef.current = next`, add:

```tsx
      if (next >= index.tokens.length) {
        setEnded(true)
        setControlsVisible(true)
      }
```

- [ ] **Step 4: Clear ended on restart and on play**

In `restart` (line 500) add `setEnded(false)`. In `startPlayback` (line 461) add `setEnded(false)` as the first line.

- [ ] **Step 5: Render the overlay**

Inside the mirrored-stage div, after the countdown block (after line 819), add:

```tsx
        {ended && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ls-black/80">
            <p className="display text-2xl text-ls-white">{t('prompter.endTitle')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={restart}
                className="rounded-btn bg-ls-blue px-4 py-2 text-sm text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed"
              >
                {t('prompter.restartFull')}
              </button>
              <button
                type="button"
                onClick={exit}
                className="rounded-btn px-4 py-2 text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
              >
                {t('prompter.endBack')}
              </button>
            </div>
          </div>
        )}
```

Note: the overlay sits inside the mirrored stage; if `mirrorX/Y` are active the buttons mirror too. That is acceptable (matches the rig view). If a reviewer objects, the fix is to render it as a sibling of the mirrored div — leave as-is unless flagged.

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Manual smoke: let a short script scroll to the end in constant mode → overlay appears; Restart clears it and returns to start.

- [ ] **Step 7: Commit**

```bash
git add src/routes/prompter.tsx
git commit -m "feat(prompter): end-of-script overlay with restart/back

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Permission errors get a retry action

**Files:**
- Modify: `src/routes/prompter.tsx`

**Interfaces:**
- Consumes: i18n `prompter.tryAgain` (Task 2).

- [ ] **Step 1: Extend the notice model**

Replace the `notice` state (line 182) with one that can carry an action:

```tsx
  const [notice, setNotice] = useState<{ message: string; retry?: () => void } | null>(null)
```

- [ ] **Step 2: Update `showNotice`**

Replace `showNotice` (lines 244–252) with a version that accepts an optional retry and does not auto-hide when a retry is present:

```tsx
  const showNotice = useCallback((message: string, retry?: () => void) => {
    setNotice({ message, retry })
    setControlsVisible(true)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    if (!retry) {
      noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_HIDE_DELAY)
    }
  }, [])
```

- [ ] **Step 3: Pass retry handlers at the call sites**

- Camera denied (line 264): `showNotice(t('prompter.cameraDenied'), () => setCamera(true))`
- Mic denied (in `useVoiceTracking` onPermissionDenied, line 372): `showNotice(t('prompter.micDenied'), () => setVoice(true))`
- Voice unavailable (line 377): keep auto-hide — `showNotice(t('prompter.voiceUnavailable'))` (no retry).
- `settings.voiceUnsupported` (line 526) and `toggleVoice`: leave as-is.

- [ ] **Step 4: Render message + retry button**

Replace the notice block (lines 834–838) with:

```tsx
        {notice && (
          <div className="mx-auto mb-2 flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-card bg-ls-gray-900/95 px-4 py-2">
            <p className="text-sm text-ls-white">{notice.message}</p>
            {notice.retry && (
              <button
                type="button"
                onClick={() => {
                  const r = notice.retry
                  setNotice(null)
                  r?.()
                }}
                className="rounded-btn px-2 py-1 text-sm text-ls-blue transition-colors duration-[140ms] hover:text-ls-white"
              >
                {t('prompter.tryAgain')}
              </button>
            )}
          </div>
        )}
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. (Permission denial is hard to script; verify the build and that non-retry notices still auto-hide.)

- [ ] **Step 6: Commit**

```bash
git add src/routes/prompter.tsx
git commit -m "feat(prompter): retry action on permission notices

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Consistent focus-visible rings

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add a global focus-visible rule**

In `src/styles.css`, inside the base layer near the body styles (after the `font-family` rule around line 93), add:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 3px;
}
```

This applies app-wide. The prompter's dark surface uses `--accent` (iOS blue) which is visible on black.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: PASS. Manual: tab through editor and prompter controls — every focused control shows a blue ring; mouse clicks do not (focus-visible only).

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(styles): consistent focus-visible ring

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (done)

- Spec A (autosave) → Task 3. Spec B (time) → Tasks 1 + 4. Spec C (states) → Tasks 5 + 6. Spec D (focus) → Task 7. i18n → Task 2.
- No placeholders; every code step shows the code.
- Type consistency: `formatClock` signature matches between Task 1 and Task 4; `showNotice` retry signature matches between Task 6 steps.
