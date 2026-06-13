# Voice Tracking Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make voice tracking follow the speaker smoothly and in order (no erratic up/down jumps), and dim the already-spoken text.

**Architecture:** Replace the greedy `advanceCursor` matcher with a monotonic `alignCursor` that aligns the *tail* of recognized speech against a forward window of the script and only moves on a confident multi-word run. The prompter feeds the live cursor each utterance, eases the scroll toward the matched word, and dims spans up to the spoken boundary via a cached span array (no React re-render).

**Tech Stack:** TypeScript, React, TanStack Start, Vitest, Tailwind v4, Biome. Pure matching logic in `src/lib/voice.ts`; DOM/scroll in `src/routes/prompter.tsx`.

---

## File Structure

- `src/lib/voice.ts` — add `alignCursor` + tuning constants; remove dead `advanceCursor` at the end. Pure, unit-tested.
- `src/lib/voice.test.ts` — add `alignCursor` tests; remove `advanceCursor` tests at the end.
- `src/routes/prompter.tsx` — switch `handleUtterance` to `alignCursor`, drop the `utteranceBaseRef` baseline machinery, add a cached `wordSpansRef` + `setSpokenBoundary` dimming helper, wire it into `handleUtterance`, `syncVoiceCursor`, `restart`, and span-rebuild.
- `src/styles.css` — add the `.spoken` dimming class.

Already on branch `feat/voice-tracking-sync` with the design spec committed.

---

## Task 1: Add `alignCursor` matcher (pure, TDD)

**Files:**
- Modify: `src/lib/voice.ts` (after `advanceCursor`, before `SPEECH_LANGUAGES` at line 126)
- Test: `src/lib/voice.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/voice.test.ts`. First add `alignCursor` to the import block at the top (line 2-10):

```ts
import {
  advanceCursor,
  alignCursor,
  buildScriptIndex,
  matchSpeechLang,
  resolveSpeechLang,
  SPEECH_LANGUAGES,
  tokenize,
  tokensMatch,
} from './voice'
```

Then append this describe block to the end of the file:

```ts
describe('alignCursor', () => {
  const script = tokenize('the quick brown fox jumps over the lazy dog')
  const long = tokenize(
    'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango',
  )

  it('advances on a confident run of words', () => {
    expect(alignCursor(script, 0, ['the', 'quick', 'brown'])).toBe(3)
  })

  it('advances on a two-word run within the near window', () => {
    expect(alignCursor(script, 0, ['the', 'quick'])).toBe(2)
  })

  it('does not move on a lone common word that matches several places', () => {
    // "the" appears at indices 0 and 6; one word is not a confident run
    expect(alignCursor(script, 0, ['the'])).toBe(0)
  })

  it('never recedes below the committed cursor', () => {
    // all three words are behind committed=5; cursor must not jump back
    expect(alignCursor(script, 5, ['the', 'quick', 'brown'])).toBe(5)
  })

  it('ignores a lone word that matches behind/at the cursor', () => {
    expect(alignCursor(script, 5, ['the'])).toBe(5)
  })

  it('recovers when one script word was misrecognized (one gap)', () => {
    // "brown" skipped: the quick __ fox
    expect(alignCursor(script, 0, ['the', 'quick', 'fox'])).toBe(4)
  })

  it('repositions on a long jump only with a 3-word run', () => {
    // romeo/sierra/tango are at indices 17/18/19, far past the near window
    expect(alignCursor(long, 0, ['romeo', 'sierra', 'tango'])).toBe(20)
  })

  it('does not take a long jump on only two matched words', () => {
    expect(alignCursor(long, 0, ['sierra', 'tango'])).toBe(0)
  })

  it('aligns interim prefixes', () => {
    expect(alignCursor(script, 0, ['the', 'quick', 'brow'])).toBe(3)
  })

  it('aligns CJK per-character tokens', () => {
    const jp = tokenize('これは テスト です')
    expect(alignCursor(jp, 0, tokenize('これは テスト'))).toBe(
      tokenize('これは').length + tokenize('テスト').length,
    )
  })

  it('leaves the cursor unchanged for empty speech', () => {
    expect(alignCursor(script, 2, [])).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/voice.test.ts`
Expected: FAIL — `alignCursor is not a function` (or import error).

- [ ] **Step 3: Implement `alignCursor`**

In `src/lib/voice.ts`, insert after the `advanceCursor` function (after line 126, before the `SPEECH_LANGUAGES` doc comment):

```ts
/** Number of trailing spoken tokens used as the alignment anchor. */
export const RECENT_TAIL = 8
/** Distance (in tokens) below which a 2-word run is enough to advance. */
export const NEAR = 16
/** How far ahead of the cursor alignment will look for a confident match. */
export const ALIGN_LOOKAHEAD = 60
/** Matched-token runs required to accept a near advance vs. a far jump. */
export const NEAR_MIN_RUN = 2
export const FAR_MIN_RUN = 3

/**
 * Aligns the tail of recognized speech against the script ahead of the cursor.
 *
 * Speech engines rewrite interim transcripts constantly, so re-matching the
 * whole utterance is unstable. Instead we look only at the last few spoken
 * tokens ("what is being said now") and find the script position where that
 * short run best fits. The cursor is monotonic — it only ever moves forward —
 * and a move is accepted only on a confident run (≥2 tokens nearby, ≥3 for a
 * long jump), so a lone common word or a noisy revision never drags the
 * prompter around.
 */
export function alignCursor(
  scriptTokens: string[],
  committed: number,
  spokenTokens: string[],
  opts?: { lookahead?: number; recentTail?: number },
): number {
  const lookahead = opts?.lookahead ?? ALIGN_LOOKAHEAD
  const recentTail = opts?.recentTail ?? RECENT_TAIL
  const tail = spokenTokens.slice(-recentTail)
  if (tail.length === 0) return committed

  const limit = Math.min(committed + lookahead, scriptTokens.length)
  let bestEnd = committed
  let bestScore = 0

  /* For each candidate end position, walk backward counting how many of the
     tail tokens match the script ending there, tolerating one skipped script
     token. The nearest position wins ties (strict >), keeping moves small. */
  for (let candidate = committed + 1; candidate <= limit; candidate++) {
    let score = 0
    let gaps = 0
    let s = candidate - 1
    let t = tail.length - 1
    while (s >= committed && t >= 0) {
      if (tokensMatch(scriptTokens[s], tail[t])) {
        score++
        s--
        t--
      } else {
        if (++gaps > 1) break
        s--
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestEnd = candidate
    }
  }

  if (bestEnd <= committed) return committed
  const minRun = bestEnd - committed > NEAR ? FAR_MIN_RUN : NEAR_MIN_RUN
  return bestScore >= minRun ? bestEnd : committed
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/voice.test.ts`
Expected: PASS — all `alignCursor` tests green, existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/voice.ts src/lib/voice.test.ts
git commit -m "feat(voice): add monotonic tail-alignment cursor matcher"
```

---

## Task 2: Switch the prompter to `alignCursor`

Replaces the greedy matcher and the interim-baseline machinery. After this task `advanceCursor` is unused (removed in Task 4).

**Files:**
- Modify: `src/routes/prompter.tsx` — import (line ~30s), refs (258-265), `syncVoiceCursor` (275-299), `handleUtterance` (301-322), `restart` (469-475)

- [ ] **Step 1: Update the import**

The `../lib/voice` import is multi-line (lines 48-53). Change the first member `advanceCursor,` (line 49) to `alignCursor,` — keep it alphabetical-friendly as is:

```ts
import {
  alignCursor,
  buildScriptIndex,
  resolveSpeechLang,
  SPEECH_LANGUAGES,
} from '../lib/voice'
```

- [ ] **Step 2: Remove the `utteranceBaseRef` declaration**

In the voice refs block (around lines 258-261), delete the `utteranceBaseRef` line:

```ts
  const voiceCursorRef = useRef(0)
  const voiceTargetRef = useRef<number | null>(null)
  const voiceActiveRef = useRef(false)
```

(The line `const utteranceBaseRef = useRef(0)` is removed.)

- [ ] **Step 3: Drop the baseline reset inside `syncVoiceCursor`**

In `syncVoiceCursor` (lines 296-298), remove the `utteranceBaseRef` line so it ends:

```ts
    voiceCursorRef.current = cursor
    voiceTargetRef.current = null
```

- [ ] **Step 4: Rewrite `handleUtterance`**

Replace the whole `handleUtterance` callback (lines 301-322) with:

```ts
  const handleUtterance = useCallback(
    ({ tokens }: UtteranceEvent) => {
      const index = scriptIndexRef.current
      const next = alignCursor(index.tokens, voiceCursorRef.current, tokens)
      if (next === voiceCursorRef.current) return
      voiceCursorRef.current = next
      const wordIndex = index.tokenToWord[next - 1]
      const stage = stageRef.current
      const content = contentRef.current
      const span = content?.querySelector<HTMLElement>(
        `[data-wi="${wordIndex}"]`,
      )
      if (!stage || !content || !span) return
      const offset =
        span.getBoundingClientRect().top - content.getBoundingClientRect().top
      voiceTargetRef.current = offset - stage.clientHeight * voiceAnchor()
    },
    [voiceAnchor],
  )
```

(`isFinal`/`isNew` are no longer used; the cursor itself is the stable baseline. The DOM dimming call is added in Task 3.)

- [ ] **Step 5: Remove the baseline reset inside `restart`**

In `restart` (lines 469-475), delete the `utteranceBaseRef` line:

```ts
  const restart = useCallback(() => {
    posRef.current = 0
    voiceCursorRef.current = 0
    voiceTargetRef.current = null
    showControls()
  }, [showControls])
```

- [ ] **Step 6: Verify type-check, tests, and lint pass**

Run: `npx vitest run && npx tsc --noEmit && npx biome check src/routes/prompter.tsx`
Expected: PASS — no references to `utteranceBaseRef` or `advanceCursor` remain in `prompter.tsx`; types clean.

- [ ] **Step 7: Commit**

```bash
git add src/routes/prompter.tsx
git commit -m "feat(voice): drive prompter scroll with alignCursor, drop interim baseline"
```

---

## Task 3: Dim already-spoken text

Adds an O(1) span cache and a boundary helper that dims words up to the cursor, then wires it into the cursor changes.

**Files:**
- Modify: `src/styles.css` (near the `.voice-live` block, lines 159-172)
- Modify: `src/routes/prompter.tsx` — new refs + `setSpokenBoundary`, a span-cache effect, and calls in `handleUtterance`, `syncVoiceCursor`, `restart`

- [ ] **Step 1: Add the `.spoken` CSS class**

In `src/styles.css`, after the `.voice-live` rule (after line 172), add:

```css
/* Already-spoken words fade back so the speaker sees their position */
.spoken {
  opacity: 0.4;
  transition: opacity 0.3s var(--ease-out);
}
```

- [ ] **Step 2: Add the span cache + boundary refs**

In the voice refs block in `src/routes/prompter.tsx` (after `voiceActiveRef`, ~line 261), add:

```ts
  const wordSpansRef = useRef<HTMLElement[]>([])
  const spokenWordRef = useRef(-1)
```

- [ ] **Step 3: Add the `setSpokenBoundary` helper**

Add this `useCallback` immediately before `syncVoiceCursor` (before line 275):

```ts
  /* Dims every word up to `wordIndex` (inclusive) and un-dims the rest.
     Idempotent and direction-aware so re-syncing backward clears stale dimming.
     Uses the cached span array to avoid a React re-render every utterance. */
  const setSpokenBoundary = useCallback((wordIndex: number) => {
    const spans = wordSpansRef.current
    const prev = spokenWordRef.current
    if (wordIndex > prev) {
      for (let i = prev + 1; i <= wordIndex; i++) {
        spans[i]?.classList.add('spoken')
      }
    } else if (wordIndex < prev) {
      for (let i = wordIndex + 1; i <= prev; i++) {
        spans[i]?.classList.remove('spoken')
      }
    }
    spokenWordRef.current = wordIndex
  }, [])
```

- [ ] **Step 4: Build the span cache when the script changes**

Add this effect after the `scriptIndexRef` assignment (after line 228):

```ts
  /* Cache word spans by index for O(1) dimming and reset the spoken boundary
     whenever the rendered script changes. */
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const arr: HTMLElement[] = []
    for (const el of content.querySelectorAll<HTMLElement>('[data-wi]')) {
      arr[Number(el.dataset.wi)] = el
    }
    wordSpansRef.current = arr
    spokenWordRef.current = -1
  }, [sections])
```

- [ ] **Step 5: Dim on cursor advance in `handleUtterance`**

In the rewritten `handleUtterance` (Task 2 Step 4), add the dim call right after `voiceCursorRef.current = next`:

```ts
      voiceCursorRef.current = next
      const wordIndex = index.tokenToWord[next - 1]
      setSpokenBoundary(wordIndex)
```

Then add `setSpokenBoundary` to the callback's dependency array:

```ts
    [voiceAnchor, setSpokenBoundary],
  )
```

- [ ] **Step 6: Sync dimming when voice starts mid-script**

At the end of `syncVoiceCursor`, after `voiceTargetRef.current = null`, add:

```ts
    voiceCursorRef.current = cursor
    voiceTargetRef.current = null
    setSpokenBoundary(cursor > 0 ? index.tokenToWord[cursor - 1] : -1)
```

Add `setSpokenBoundary` to `syncVoiceCursor`'s dependency array:

```ts
  }, [voiceAnchor, setSpokenBoundary])
```

- [ ] **Step 7: Clear dimming on restart**

In `restart` (Task 2 Step 5 version), add a clear call:

```ts
  const restart = useCallback(() => {
    posRef.current = 0
    voiceCursorRef.current = 0
    voiceTargetRef.current = null
    setSpokenBoundary(-1)
    showControls()
  }, [showControls, setSpokenBoundary])
```

- [ ] **Step 8: Verify type-check, tests, lint, and build pass**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS on all.

- [ ] **Step 9: Manual smoke test**

Run: `npm run dev`, open `/prompter?id=<a script>`, start playback, enable voice, and read aloud.
Expected: the script eases forward in reading order with no up/down jitter; spoken words fade to ~40% opacity; pausing keeps the dim; restart clears it.

- [ ] **Step 10: Commit**

```bash
git add src/routes/prompter.tsx src/styles.css
git commit -m "feat(voice): dim already-spoken words as the cursor advances"
```

---

## Task 4: Remove the dead `advanceCursor`

Cleanup once nothing references the old matcher.

**Files:**
- Modify: `src/lib/voice.ts` — remove `advanceCursor` (lines 104-126) and `MATCH_LOOKAHEAD` (lines 10-11) if now unused
- Modify: `src/lib/voice.test.ts` — remove the `advanceCursor` import and its `describe` block

- [ ] **Step 1: Confirm `advanceCursor` and `MATCH_LOOKAHEAD` are unused**

Run: `grep -rn "advanceCursor\|MATCH_LOOKAHEAD" src --include='*.ts' --include='*.tsx'`
Expected: matches only in `src/lib/voice.ts` and `src/lib/voice.test.ts`.

- [ ] **Step 2: Delete `advanceCursor`, `MATCH_LOOKAHEAD`, and its tests**

In `src/lib/voice.ts`, remove the `MATCH_LOOKAHEAD` export (lines 10-11) and the entire `advanceCursor` function (lines 104-126, including its doc comment). Update `alignCursor`'s default if it referenced `MATCH_LOOKAHEAD` — it uses `ALIGN_LOOKAHEAD`, so no change needed.

In `src/lib/voice.test.ts`, remove `advanceCursor` from the import block and delete the entire `describe('advanceCursor', ...)` block (lines 88-122).

- [ ] **Step 3: Verify everything passes**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS — no unused-symbol errors, no dangling references.

- [ ] **Step 4: Commit**

```bash
git add src/lib/voice.ts src/lib/voice.test.ts
git commit -m "refactor(voice): remove unused advanceCursor matcher"
```

---

## Self-Review

**Spec coverage:**
- Bloco A (new matching algorithm): Task 1 (`alignCursor` + monotonicity + tail + run threshold + wider cautious window) and Task 2 (wire-in). ✓
- Bloco B (scroll smoothing): no loop rewrite needed — monotonic cursor makes the existing `voiceTargetRef`/`VOICE_EASE` ease forward-only. Verified by Task 3 Step 9 smoke test. ✓
- Bloco C (spoken dimming): Task 3 (`.spoken` CSS, `wordSpansRef`, `setSpokenBoundary`, wired into advance/sync/restart). ✓
- Out of scope (no `useVoiceTracking.ts` change, no current-word highlight): respected. ✓

**Placeholder scan:** none — every code step shows full code and exact commands.

**Type consistency:** `alignCursor(scriptTokens, committed, spokenTokens, opts?)` defined in Task 1 and called identically in Task 2/3. `setSpokenBoundary(wordIndex)` defined and called consistently. `wordSpansRef`/`spokenWordRef` names match across tasks. `UtteranceEvent.tokens` is the only field used in the new `handleUtterance`.
