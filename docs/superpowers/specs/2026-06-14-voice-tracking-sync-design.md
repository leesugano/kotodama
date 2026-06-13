# Voice tracking sync — design

## Problem

When voice tracking follows the speaker, the prompter scroll jumps erratically up
and down and loses the reading order. Two outcomes are wanted:

1. The script should follow the speaker smoothly, always forward, in order — no
   wild up/down jumps.
2. Already-spoken text should be slightly dimmed so the speaker sees where they
   are.

## Root cause

The current matcher (`advanceCursor` in `src/lib/voice.ts`, driven by
`handleUtterance` in `src/routes/prompter.tsx`) has three weaknesses that combine
into the erratic behavior:

1. **Interim revisions move the cursor backward.** The Web Speech API emits
   *interim* transcripts and rewrites them retroactively ("ice cream" ⇄ "I
   scream"). Every revision re-matches the whole utterance from a fixed baseline
   and recomputes the position from scratch. A revision with fewer matched words
   yields a *smaller* cursor → the scroll goes **up**. The next word sends it down
   again. That is the "jumps up and down".
2. **Matching is too permissive and first-match wins.** The lookahead scans 16
   tokens ahead, accepts 4-letter prefixes and single-character edits. Short
   common words ("que", "de", "para", "e") match in many places. When one matches
   far ahead, the cursor **leaps** to the wrong spot, and since the scan only
   looks forward it never recovers.
3. **No monotonicity or smoothing guarantee.** Nothing stops the scroll target
   from oscillating between frames.

The infrastructure to fix this already exists: the token→word index
(`buildScriptIndex`) and the rendered `[data-wi]` spans.

## Decisions (agreed)

- **Visual:** dim only what has already been spoken. Current word and upcoming
  text stay at normal brightness. No highlight on the current word.
- **Improvisation handling:** cautious forward search. If the speaker skips a
  passage, the system may reposition forward only when several words match in
  sequence (not a single word).

## Design

### A. New matching algorithm (`src/lib/voice.ts`)

Replace the greedy, token-by-token `advanceCursor` with **tail alignment with a
confidence threshold**. Functions stay pure and unit-testable.

- **Monotonic cursor.** The confirmed cursor never decreases. This alone kills the
  "scroll goes up" failure: interim revisions can no longer drag it backward.
- **Align on the tail of speech.** Instead of re-matching the whole (constantly
  rewritten) utterance, look only at the **last ~8 spoken tokens** — "what is
  being said now" — and find where that short sequence fits ahead of the cursor.
- **Require a run, not a lone word.** A jump is accepted only when **≥2 tokens
  match in sequence** for nearby advances, and **≥3 in sequence** for long
  repositions (the "skipped a paragraph" case). A lone short/common word no longer
  moves the cursor. This kills the "leap to the wrong spot" failure.
- **Wider but cautious search window.** The search range is widened (to allow
  recovering after improvisation), but the confidence threshold above means it
  only repositions when sure.

Proposed shape (names may change during TDD):

```
alignCursor(scriptTokens, committed, spokenTokens, opts?) -> number
```

- Considers candidate end positions in `[committed, committed + LOOKAHEAD]`.
- Scores each candidate by how many of the last spoken tokens match the script
  ending at that position (suffix alignment, contiguous with at most a small gap).
- Picks the best-scoring candidate; on ties prefers the nearest (most
  conservative).
- Acceptance rule by distance `d = end - committed`:
  - `d <= NEAR` (≈16): accept when score ≥ 2.
  - `d > NEAR`: accept when score ≥ 3.
- Returns `max(committed, accepted)` — never recedes. Returns `committed`
  unchanged when nothing clears the threshold.

Parameters (tunable, fixed in code, covered by tests): `RECENT_TAIL = 8`,
`NEAR = 16`, `LOOKAHEAD ≈ 60`, `NEAR_MIN_RUN = 2`, `FAR_MIN_RUN = 3`.

`tokenize`, `buildScriptIndex`, `tokensMatch` are reused unchanged.

#### Test cases (TDD, pure code)

- Interim revision with fewer matches does **not** move the cursor backward.
- A lone common word (matching several places ahead) does **not** jump.
- A real run of words advances the cursor to the correct position.
- Skipping a paragraph then resuming with ≥3 matched words repositions forward.
- A 2-word run within `NEAR` advances; a 1-word match does not.
- Prefix matches ("brow"→"brown") and CJK per-character tokens still align.
- Empty/garbage spoken tokens leave the cursor unchanged.

### B. Scroll smoothing (`prompter.tsx`, the `raf` loop)

- The scroll target (`voiceTargetRef`) becomes **monotonic** (it follows the
  non-receding cursor), so the existing `ease` already produces smooth,
  always-forward motion.
- Keep the current `VOICE_EASE` and easing; tune only if needed for fluidity. The
  animation loop is not rewritten — it already uses GPU-accelerated `transform`
  and delta-time.

### C. Spoken-text dimming (`prompter.tsx` + `src/styles.css`)

- Cache spans by word index (`wordSpansRef[wordIndex] = element`) when the script
  mounts, for **O(1)** updates without a React re-render.
- As the cursor advances, add the `.spoken` class only to spans in the newly
  covered range (from the last marked word up to the current one). On
  stop/re-sync, recompute the dim from the current position.
- CSS: `.spoken { opacity: 0.4; transition: opacity .3s ease }` — "a little
  darker", smooth fade. Current and upcoming words stay at normal brightness (no
  highlight).
- The "spoken up to" word is `tokenToWord[cursor - 1]`.

## Files touched

- `src/lib/voice.ts` — new alignment algorithm + tests.
- `src/routes/prompter.tsx` — `handleUtterance`, `syncVoiceCursor`, dimming via
  `wordSpansRef`.
- `src/styles.css` — `.spoken` class.

## Out of scope

- No change to the speech recognition lifecycle (`useVoiceTracking.ts`), language
  selection, or the constant-speed scroll mode.
- No highlight of the current word/line.
