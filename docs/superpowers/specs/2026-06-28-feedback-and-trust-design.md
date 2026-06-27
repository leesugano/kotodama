# Feedback and trust — design

## Problem

The app works well but rarely tells the user what state it is in. Four gaps erode
confidence:

1. **Autosave is silent.** The editor persists to IndexedDB on a 500ms debounce
   (`editor.tsx` `handleChange`) with no visual confirmation. On a local-first app
   with no account, the user has no signal their work is safe.
2. **No time information in the prompter.** Playback shows only a hairline progress
   bar (`prompter.tsx`). Professionals expect elapsed / total time.
3. **Dead-end states.** Reaching the end of the script during voice tracking passes
   silently past the last token (`prompter.tsx:339`); an empty script scrolls
   nowhere; mic/camera permission errors vanish after 4s with no recovery action.
4. **Inconsistent focus rings.** Focusable controls rely on the browser default
   outline, which varies and reads as unfinished.

## Decisions (agreed)

- Save indicator is discreet text in the editor footer, not a toast.
- Prompter time is honest: in constant-speed mode show `elapsed / total`; in voice
  mode there is no fixed speed, so show elapsed + percent, never a fake total.
- End-of-script shows a calm overlay with restart / back actions, not an alert.
- Focus rings use the existing `--accent` token and respect reduced-motion.

## Design

### A. Autosave indicator (`editor.tsx`, i18n)

A local `saveStatus: 'idle' | 'saving' | 'saved' | 'error'` drives a small line in
the footer next to the word count.

- On keystroke → `saving` ("Saving…").
- After the debounced `repository.save` resolves → `saved` ("Saved" with a small
  check glyph from lucide, `aria-hidden`), auto-fading to `idle` after ~2s via a
  timeout (cleared on the next keystroke).
- If `save` rejects (quota, private mode) → `error` ("Couldn't save"), persistent,
  in `--accent`, until the next successful save.

The status is derived in the editor; the repository call already exists. New i18n
keys `editor.saving`, `editor.saved`, `editor.saveError` (en / pt-BR / ja).

### B. Prompter time display (`prompter.tsx`, i18n)

A `mm:ss / mm:ss` readout near the progress bar, following the same auto-hide as
the controls.

- **Elapsed** = real playback clock. A ref accumulates `dt` only while playing
  (pause freezes it; restart resets it). Computed in the existing rAF loop, written
  to a throttled state (≤ 4 updates/s) so it does not re-render per frame.
- **Total (constant mode)** = `maxScroll / speed` seconds, recomputed when speed or
  content changes.
- **Voice mode** = show elapsed + `Math.round(progress * 100)%` (progress is the
  same value driving the bar). No total is shown, because there is no fixed rate.
- `formatClock(seconds) -> "m:ss"` is a pure helper in `text.ts`, unit-tested.

### C. Handled states (`prompter.tsx`, `voice.ts`)

- **End of script.** When constant-mode scroll reaches `max` (existing auto-stop at
  `prompter.tsx:412`), show a centered overlay "End of script" with two buttons:
  "Restart" (reuses the R handler) and "Back to editor" (reuses the exit handler).
  The overlay uses the DS card tokens and dismisses on restart or any scrub.
- **Voice past the end.** Clamp the voice cursor so it never advances beyond
  `scriptTokens.length`; when the cursor reaches the last word, stop advancing and
  surface the same end overlay. (Today it runs past silently.)
- **Permission errors.** The mic/camera transient notice gains a persistent variant
  with an action: a "Try again" affordance that re-invokes the toggle. Wording via
  i18n; no auto-hide for the error variant.

### D. Focus rings (`styles.css`)

A global `:focus-visible` rule applies a 2px ring in `--accent` with a small offset
on interactive elements, removing the default outline only when `:focus-visible` is
supported. Wrapped so `prefers-reduced-motion` users get no transition. No
per-component focus styling needed afterward.

## Files touched

- `src/routes/editor.tsx` — save status state + footer line.
- `src/routes/prompter.tsx` — time readout, elapsed ref, end overlay, error action.
- `src/lib/voice.ts` — cursor clamp at end of script.
- `src/lib/text.ts` — `formatClock` helper + tests.
- `src/styles.css` — `:focus-visible` ring.
- `src/lib/i18n.ts` — new keys (en / pt-BR / ja).

## Test cases

- `formatClock`: 0 → "0:00", 9 → "0:09", 65 → "1:05", 3725 → "62:05".
- Voice cursor clamps at `scriptTokens.length` and does not exceed it.
- Save status transitions: idle → saving → saved → idle; error path stays until
  next success (logic-level, on the status reducer/helper if extracted).

## Out of scope

- No change to the speech recognition lifecycle or scroll algorithm.
- No telemetry, no analytics, no server-side persistence.
- Per-script settings (kept global, separate decision).
