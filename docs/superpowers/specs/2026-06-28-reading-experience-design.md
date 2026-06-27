# Reading experience — design

## Problem

The prompter is the product, but the reading surface and playback control are
fixed. Line-height (1.45) and column width (900px) are hardcoded
(`prompter.tsx:761`); the only way to reposition is Restart (R) from zero; a
misaligned voice cursor can only be fixed by toggling voice off/on; and the
editor's duration estimate uses a fixed 140 WPM that ignores the reader's pace.

## Decisions (agreed)

- Adjustable typography: line-height, column width, and a sans/serif toggle. The
  serif is a system stack (Georgia/serif) — no embedded font, no bundle cost.
- Scrubbing happens only while paused, to avoid fighting the scroll loop.
- Voice cursor nudge via keyboard and discreet overlay buttons.
- Duration honesty: WPM becomes editable and persisted (global settings).

## Design

### A. Adjustable typography (`prompter.tsx`, `settings.ts`, `styles.css`)

Three new persisted settings with defaults matching today's look and clamped like
existing ones:

- `lineHeight` (1.2–2.0, default 1.45).
- `columnWidth` (600–1100px, default 900).
- `fontFamily` ('sans' | 'serif', default 'sans').

The text container reads these via inline CSS custom properties
(`--reader-leading`, `--reader-width`) and a class toggle for the family, so
changes apply without a React re-render of the word spans. Sans = the app's Inter
stack; serif = `Georgia, 'Times New Roman', serif`. Controls live in the settings
panel: two sliders and a two-option segmented toggle (DS-styled).

### B. Position scrubber (`prompter.tsx`)

While **paused**, the top progress bar becomes interactive:

- Pointer down/move on the bar maps x → target scroll
  (`ratio * maxScroll`), updates `posRef` and the transform immediately, and shows
  a thin handle at the current ratio.
- A hit area taller than the 2px bar makes it grabbable; `role="slider"` with
  `aria-valuenow` as percent; Left/Right arrows step ±2% when the bar is focused.
- In voice mode, releasing the scrub calls the existing `syncVoiceCursor` so the
  voice cursor and dimming realign to the new position.
- Disabled (non-interactive, display-only) while playing.

### C. Voice cursor nudge (`prompter.tsx`, `voice.ts`)

When voice tracking is active and the alignment drifts:

- Keyboard: `,` moves the cursor back one word, `.` forward one word. Each updates
  the committed cursor (clamped to `[0, length]`), recomputes the scroll target and
  the spoken-dimming boundary.
- Two discreet overlay buttons (back/forward word) mirror the keys for touch.
- A pure `nudgeCursor(cursor, delta, length) -> number` in `voice.ts` keeps the
  clamping testable.

### D. Honest duration (`editor.tsx`, `settings.ts`, `text.ts`)

- `wpm` becomes a persisted global setting (default 140, range 80–260).
- The editor footer shows a small editable WPM field; changing it updates the
  estimate live (`estimateSeconds(words, wpm)` already takes wpm).
- Word counting excludes markers so the estimate reflects spoken words (reuse the
  marker-stripping from the portability theme via `text.ts`).

## Files touched

- `src/routes/prompter.tsx` — typography vars, scrubber, nudge keys/buttons.
- `src/lib/settings.ts` — `lineHeight`, `columnWidth`, `fontFamily`, `wpm` with
  defaults/clamps + tests.
- `src/lib/voice.ts` — `nudgeCursor` + test.
- `src/lib/text.ts` — word count ignores markers (depends on portability theme).
- `src/routes/editor.tsx` — editable WPM field.
- `src/styles.css` — reader leading/width vars, serif class, scrubber handle.
- `src/lib/i18n.ts` — new keys (en / pt-BR / ja).

## Test cases

- `settings`: new fields default correctly, clamp out-of-range, survive corrupt
  JSON (same pattern as existing settings tests).
- `nudgeCursor`: clamps at 0 and length; +1/-1 behave; no-op past bounds.
- `scrubRatioToPos`: 0 → 0, 1 → maxScroll, 0.5 → mid (pure helper).
- Word count with markers equals word count of the stripped text.

## Out of scope

- No scrub while playing (paused only).
- No letter/word spacing, weight, or alignment controls (YAGNI).
- No embedded serif font; system stack only.
- Per-script settings (kept global).

## Dependency note

Theme 3 depends on the marker-stripping helper from the content-portability theme
(`text.ts`). Implement portability before reading-experience, or land the shared
`text.ts` helper first.
